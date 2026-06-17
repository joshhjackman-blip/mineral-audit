"""
test_rrc_parser.py

Tests the RRC OG_LEASE_CYCLE parser against a realistic synthetic file
built to match the REAL documented export format from the official
PDQ Dump User Manual: "}" delimited, real column names, including a
deliberately delinquent (unfiled) production month to test that the
parser handles real-world gaps gracefully rather than crashing.

Also includes the first true end-to-end test of the whole project:
RRC-shaped data -> ProductionRecord -> classification -> calculation,
proving the full pipeline works on data shaped like the real source,
not just hand-typed fixtures.
"""

import sys
import os
from decimal import Decimal
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))

from rrc_parser import (
    parse_og_lease_cycle_file, find_lease_records,
    lease_cycle_to_production_records, RRCParseError,
)
from lease_classifier import LeaseClause, LeaseFields, ValuationMethod, ValuationPoint, classify_deduction_rule
from royalty_calculator import PaymentRecord, Commodity, run_monthly_audit


_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_SAMPLE_FILE = os.path.join(_DATA_DIR, "sample_og_lease_cycle.dsv")


def test_parses_realistic_rrc_file_correctly():
    """Basic parse: correct row count, correct delimiter handling."""
    records = parse_og_lease_cycle_file(_SAMPLE_FILE)
    assert len(records) == 11
    print(f"PASS: parsed {len(records)} rows from realistic OG_LEASE_CYCLE format")


def test_find_lease_records_filters_and_sorts_correctly():
    """
    District + lease number is the real RRC unique key (lease number
    alone repeats across districts) — confirm filtering uses both.
    """
    records = parse_og_lease_cycle_file(_SAMPLE_FILE)
    oil_lease = find_lease_records(records, district_no="08", lease_no="054321")
    assert len(oil_lease) == 6
    assert oil_lease[0].period == date(2023, 1, 1)
    assert oil_lease[-1].period == date(2023, 6, 1)
    print("PASS: lease lookup correctly filters by district+lease and sorts chronologically")


def test_handles_delinquent_unfiled_month_without_crashing():
    """
    Real RRC data includes months where no production report was filed
    (PROD_REPORT_FILED_FLAG = 'N', volume blank). The parser must
    represent this as None volume, not crash and not silently treat it
    as zero production (which would look like a real underpayment when
    it's actually just a missing filing).
    """
    records = parse_og_lease_cycle_file(_SAMPLE_FILE)
    gas_lease = find_lease_records(records, district_no="08", lease_no="098765")
    march = next(r for r in gas_lease if r.period == date(2023, 3, 1))
    assert march.prod_report_filed_flag == "N"
    assert march.lease_gas_prod_vol is None
    print("PASS: delinquent unfiled month correctly represented as None, not zero")


def test_rejects_file_with_wrong_schema():
    """
    Anti-silent-failure guarantee: if the RRC changes their export
    format, or the wrong file is provided, the parser must raise
    rather than silently producing garbage records.
    """
    bad_file = os.path.join(_DATA_DIR, "_temp_bad_schema.dsv")
    with open(bad_file, "w") as f:
        f.write("SOME_COLUMN}ANOTHER_COLUMN\nvalue1}value2\n")

    try:
        parse_og_lease_cycle_file(bad_file)
        assert False, "Expected RRCParseError for mismatched schema"
    except RRCParseError as e:
        assert "schema" in str(e).lower()
        print("PASS: mismatched schema correctly raises RRCParseError rather than parsing garbage")
    finally:
        os.remove(bad_file)


def test_price_lookup_gap_is_surfaced_not_silently_zeroed():
    """
    RRC data is volume-only — no price. If the caller's price_lookup is
    missing a month, that month must come back as a clear skip warning,
    never silently default to a $0 price (which would look like a
    100% underpayment and be wildly wrong).
    """
    records = parse_og_lease_cycle_file(_SAMPLE_FILE)
    oil_lease = find_lease_records(records, district_no="08", lease_no="054321")

    incomplete_price_lookup = {
        (2023, 1, Commodity.OIL): Decimal("78.50"),
        # deliberately missing Feb-June prices
    }
    results = lease_cycle_to_production_records(oil_lease, incomplete_price_lookup)

    priced = [r for r, w in results if w is None]
    skipped = [w for r, w in results if w is not None]

    assert len(priced) == 1
    assert len(skipped) == 5
    assert all("No price available" in w for w in skipped)
    print(f"PASS: missing price months correctly surfaced as warnings ({len(skipped)} skipped), not zeroed")


def test_end_to_end_rrc_data_through_full_audit_pipeline():
    """
    THE key test for this module: RRC-shaped data flows all the way
    through classification and calculation to a real flagged
    underpayment, with no hand-typed ProductionRecord shortcuts anywhere
    in the chain. This is the first test in the project where every
    layer — parser, classifier, calculator — runs together on data
    shaped like the real government source.
    """
    records = parse_og_lease_cycle_file(_SAMPLE_FILE)
    oil_lease = find_lease_records(records, district_no="08", lease_no="054321")

    price_lookup = {
        (2023, 1, Commodity.OIL): Decimal("78.50"),
        (2023, 2, Commodity.OIL): Decimal("76.20"),
        (2023, 3, Commodity.OIL): Decimal("73.80"),
        (2023, 4, Commodity.OIL): Decimal("79.10"),
        (2023, 5, Commodity.OIL): Decimal("71.40"),
        (2023, 6, Commodity.OIL): Decimal("70.25"),
    }
    production_results = lease_cycle_to_production_records(oil_lease, price_lookup)

    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
        ),
    )
    classification = classify_deduction_rule(fields)

    total_variance = Decimal("0.00")
    months_flagged = 0

    for prod_record, warning in production_results:
        assert warning is None, f"Unexpected price gap: {warning}"

        gross = prod_record.volume * prod_record.reported_price
        # Simulate a $40/month gathering fee improperly deducted on a
        # gross-proceeds lease where deductions are not allowed.
        simulated_actual_payment = (gross * Decimal("0.1875")) - Decimal("40.00")

        payment = PaymentRecord(
            period=prod_record.period,
            amount_paid=simulated_actual_payment,
            payment_date=date(prod_record.period.year, prod_record.period.month, 25),
        )

        result = run_monthly_audit(
            production=prod_record,
            payment=payment,
            decimal_interest=Decimal("0.1875"),
            classification=classification,
            today=date(2024, 6, 1),
        )

        assert result.variance == Decimal("40.00"), f"Expected $40 variance, got {result.variance}"
        total_variance += result.variance
        if result.flags:
            months_flagged += 1

    assert months_flagged == 6
    assert total_variance == Decimal("240.00")
    print(f"PASS: full pipeline (RRC parse -> classify -> calculate) correctly found "
          f"${total_variance} cumulative underpayment across {months_flagged} months")


if __name__ == "__main__":
    tests = [
        test_parses_realistic_rrc_file_correctly,
        test_find_lease_records_filters_and_sorts_correctly,
        test_handles_delinquent_unfiled_month_without_crashing,
        test_rejects_file_with_wrong_schema,
        test_price_lookup_gap_is_surfaced_not_silently_zeroed,
        test_end_to_end_rrc_data_through_full_audit_pipeline,
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
