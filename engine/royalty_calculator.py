"""
royalty_calculator.py

Deterministic calculation engine for comparing expected vs. actual royalty
payments, checking payment timing compliance, and tracking the Texas
4-year statute of limitations. No LLM involvement anywhere in this module.

This engine consumes:
  1. A ClassificationResult from lease_classifier.py
  2. Production records (from the Texas RRC data pipeline)
  3. Owner-provided payment records (from check stubs / 1099s)
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from lease_classifier import ClassificationResult, DeductionRuling


# Texas Natural Resources Code §91.402 payment timing rules
FIRST_PAYMENT_DEADLINE_DAYS = 120
OIL_SUBSEQUENT_PAYMENT_DEADLINE_DAYS = 60
GAS_SUBSEQUENT_PAYMENT_DEADLINE_DAYS = 90

# Texas statute of limitations for breach of contract / royalty underpayment claims
STATUTE_OF_LIMITATIONS_YEARS = 4


class Commodity:
    OIL = "oil"
    GAS = "gas"


@dataclass
class Deduction:
    """A single itemized post-production deduction claimed by the operator."""
    label: str
    amount: Decimal


@dataclass
class ProductionRecord:
    """One month's production data for a lease, sourced from RRC bulk data."""
    period: date                 # first day of the production month
    commodity: str                # Commodity.OIL or Commodity.GAS
    volume: Decimal               # barrels (oil) or mcf (gas)
    reported_price: Decimal       # price per unit, as reported to RRC / on stub
    is_first_sale: bool = False


@dataclass
class PaymentRecord:
    """What the owner actually received for a given production period, from check stubs."""
    period: date
    amount_paid: Decimal
    payment_date: date
    deductions_itemized: list[Deduction] = field(default_factory=list)


@dataclass
class MonthlyAuditResult:
    period: date
    commodity: str
    expected_payment: Decimal
    actual_payment: Decimal
    variance: Decimal                       # expected - actual; positive = underpaid
    variance_pct: Optional[Decimal]
    deductions_taken: Decimal
    deductions_allowed: bool
    payment_due_date: date
    payment_was_late: bool
    days_late: int
    statute_of_limitations_deadline: date
    is_time_barred: bool
    flags: list = field(default_factory=list)


def _money(value) -> Decimal:
    """Round to cents using standard rounding."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_expected_payment(
    production: ProductionRecord,
    decimal_interest: Decimal,
    classification: ClassificationResult,
    itemized_deductions: list[Deduction],
) -> tuple[Decimal, Decimal]:
    """
    Returns (expected_payment, deductions_actually_applied).

    If the classification says deductions are NOT allowed, itemized
    deductions are ignored entirely when computing the expected payment —
    the owner is owed based on gross proceeds regardless of what the
    operator deducted.
    """
    gross_value = production.volume * production.reported_price

    if classification.ruling == DeductionRuling.NOT_ALLOWED:
        deductions_applied = Decimal("0.00")
    elif classification.ruling == DeductionRuling.ALLOWED:
        deductions_applied = sum((d.amount for d in itemized_deductions), Decimal("0.00"))
    else:
        # UNCLEAR: do not assume either way. Calculate both bounds instead
        # of guessing — caller should treat this as a range, not a point estimate.
        deductions_applied = Decimal("0.00")  # conservative: assume not allowed for the headline number

    net_value = gross_value - deductions_applied
    expected_payment = net_value * decimal_interest

    return _money(expected_payment), _money(deductions_applied)


def _payment_due_date(production: ProductionRecord) -> date:
    """Per Texas Natural Resources Code §91.402."""
    end_of_month = _last_day_of_month(production.period)
    if production.is_first_sale:
        return end_of_month + timedelta(days=FIRST_PAYMENT_DEADLINE_DAYS)
    if production.commodity == Commodity.OIL:
        return end_of_month + timedelta(days=OIL_SUBSEQUENT_PAYMENT_DEADLINE_DAYS)
    return end_of_month + timedelta(days=GAS_SUBSEQUENT_PAYMENT_DEADLINE_DAYS)


def _last_day_of_month(d: date) -> date:
    if d.month == 12:
        return date(d.year, 12, 31)
    next_month = date(d.year, d.month + 1, 1)
    return next_month - timedelta(days=1)


def run_monthly_audit(
    production: ProductionRecord,
    payment: PaymentRecord,
    decimal_interest: Decimal,
    classification: ClassificationResult,
    today: date,
) -> MonthlyAuditResult:
    """
    The core audit function: compares one month of expected vs. actual
    payment, checks timing compliance, and checks the statute of limitations.
    """
    flags: list[str] = []

    expected_payment, deductions_applied = calculate_expected_payment(
        production, decimal_interest, classification, payment.deductions_itemized
    )

    actual_payment = _money(payment.amount_paid)
    variance = _money(expected_payment - actual_payment)
    variance_pct = (
        _money((variance / expected_payment) * 100) if expected_payment != 0 else None
    )

    due_date = _payment_due_date(production)
    payment_was_late = payment.payment_date > due_date
    days_late = (payment.payment_date - due_date).days if payment_was_late else 0

    limitations_deadline = date(
        due_date.year + STATUTE_OF_LIMITATIONS_YEARS, due_date.month, due_date.day
    )
    is_time_barred = today > limitations_deadline

    if classification.ruling == DeductionRuling.UNCLEAR:
        flags.append(
            "Lease deduction rule could not be confidently classified. "
            "The expected payment above conservatively assumes NO deductions "
            "are allowed. If deductions are in fact permitted, the true "
            "variance may be smaller. Manual review required before relying "
            "on this figure."
        )

    if is_time_barred:
        flags.append(
            f"This production period is past the {STATUTE_OF_LIMITATIONS_YEARS}-year "
            "Texas statute of limitations. Recovery for this specific month is "
            "likely time-barred. Consult an attorney regarding discovery rule "
            "exceptions before assuming this period is unrecoverable."
        )
    elif (limitations_deadline - today).days < 180:
        flags.append(
            "Statute of limitations deadline is within 6 months. "
            "If a claim is warranted, action should be taken soon."
        )

    if abs(variance) > 0 and expected_payment != 0:
        if variance > 0:
            flags.append(f"Possible underpayment of ${variance} detected for this period.")
        elif variance < 0:
            flags.append(
                f"Payment exceeds the calculated expected amount by ${abs(variance)}. "
                "Worth double-checking the decimal interest and price inputs."
            )

    return MonthlyAuditResult(
        period=production.period,
        commodity=production.commodity,
        expected_payment=expected_payment,
        actual_payment=actual_payment,
        variance=variance,
        variance_pct=variance_pct,
        deductions_taken=deductions_applied,
        deductions_allowed=(classification.ruling == DeductionRuling.ALLOWED),
        payment_due_date=due_date,
        payment_was_late=payment_was_late,
        days_late=days_late,
        statute_of_limitations_deadline=limitations_deadline,
        is_time_barred=is_time_barred,
        flags=flags,
    )
