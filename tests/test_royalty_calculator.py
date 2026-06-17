"""
test_royalty_calculator.py

End-to-end test of the calculation engine: feeds a classification result
and realistic production/payment records through run_monthly_audit and
checks the math, timing, and statute of limitations logic by hand.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))

from decimal import Decimal
from datetime import date

from lease_classifier import (
    LeaseClause, LeaseFields, ValuationMethod, ValuationPoint,
    classify_deduction_rule,
)
from royalty_calculator import (
    ProductionRecord, PaymentRecord, Deduction, Commodity,
    run_monthly_audit,
)


def test_underpayment_due_to_improper_deduction():
    """
    Scenario: Gross proceeds lease (no deductions allowed per Judice),
    but the operator improperly deducted $1,500 in gathering fees anyway.
    The engine should flag the FULL deduction as an improper underpayment,
    not just a partial variance.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,  # 3/16
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
        ),
    )
    classification = classify_deduction_rule(fields)

    production = ProductionRecord(
        period=date(2023, 6, 1),
        commodity=Commodity.OIL,
        volume=Decimal("1000"),       # 1000 barrels
        reported_price=Decimal("70.00"),  # $70/bbl
        is_first_sale=False,
    )
    # gross value = 1000 * 70 = $70,000
    # owner's 3/16 share of gross = 70000 * 0.1875 = $13,125.00 expected

    payment = PaymentRecord(
        period=date(2023, 6, 1),
        amount_paid=Decimal("12843.75"),  # operator deducted $1,500 gathering fee first: (70000-1500)*0.1875
        payment_date=date(2023, 8, 20),  # within 60-day window after June -> due ~Aug 30
        deductions_itemized=[Deduction(label="gathering fee", amount=Decimal("1500.00"))],
    )

    result = run_monthly_audit(
        production=production,
        payment=payment,
        decimal_interest=Decimal("0.1875"),
        classification=classification,
        today=date(2024, 1, 1),
    )

    assert result.expected_payment == Decimal("13125.00"), f"got {result.expected_payment}"
    assert result.actual_payment == Decimal("12843.75")
    assert result.variance == Decimal("281.25"), f"got {result.variance}"
    assert result.deductions_allowed is False
    assert result.is_time_barred is False
    print(f"PASS: underpayment correctly calculated at ${result.variance} "
          f"(operator improperly deducted gathering fee on a gross proceeds lease)")
    print(f"  Flags raised: {result.flags}")


def test_time_barred_period_is_flagged():
    """
    A production period from 6+ years ago should be flagged as time-barred
    under the 4-year Texas statute of limitations.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
        ),
    )
    classification = classify_deduction_rule(fields)

    production = ProductionRecord(
        period=date(2017, 3, 1),
        commodity=Commodity.GAS,
        volume=Decimal("500"),
        reported_price=Decimal("3.00"),
        is_first_sale=False,
    )
    payment = PaymentRecord(
        period=date(2017, 3, 1),
        amount_paid=Decimal("200.00"),
        payment_date=date(2017, 6, 1),
    )

    result = run_monthly_audit(
        production=production,
        payment=payment,
        decimal_interest=Decimal("0.1875"),
        classification=classification,
        today=date(2024, 1, 1),
    )

    assert result.is_time_barred is True
    assert any("time-barred" in f.lower() or "statute" in f.lower() for f in result.flags)
    print(f"PASS: 2017 production period correctly flagged as time-barred as of 2024")


def test_late_payment_detection():
    """
    Per Tex. Nat. Res. Code §91.402, subsequent gas payments are due within
    90 days of end of production month. A payment made 120 days out should
    be flagged late.
    """
    fields = LeaseFields(
        royalty_fraction=0.20,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
        ),
    )
    classification = classify_deduction_rule(fields)

    production = ProductionRecord(
        period=date(2023, 1, 1),
        commodity=Commodity.GAS,
        volume=Decimal("800"),
        reported_price=Decimal("4.00"),
        is_first_sale=False,
    )
    # due date = Jan 31 + 90 days = ~May 1
    payment = PaymentRecord(
        period=date(2023, 1, 1),
        amount_paid=Decimal("640.00"),
        payment_date=date(2023, 5, 30),  # well past the ~May 1 due date
    )

    result = run_monthly_audit(
        production=production,
        payment=payment,
        decimal_interest=Decimal("0.20"),
        classification=classification,
        today=date(2024, 1, 1),
    )

    assert result.payment_was_late is True
    assert result.days_late > 0
    print(f"PASS: late payment correctly detected, {result.days_late} days late "
          f"(due {result.payment_due_date}, paid {payment.payment_date})")


if __name__ == "__main__":
    tests = [
        test_underpayment_due_to_improper_deduction,
        test_time_barred_period_is_flagged,
        test_late_payment_detection,
    ]
    failures = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {t.__name__} -> {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests passed.")
    if failures:
        sys.exit(1)
