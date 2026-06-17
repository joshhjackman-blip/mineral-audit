"""
lease_classifier.py

Deterministic classification engine for Texas oil & gas royalty lease
deduction rules. This module contains ZERO LLM calls. It takes
structured lease fields (already extracted, by a human or an LLM-assisted
extraction step) and applies fixed, citable legal logic to determine
whether post-production deductions are permitted.

Every branch in this engine is tied to a specific Texas Supreme Court
or Court of Appeals holding. See docs/case_law.md for the citations.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ValuationMethod(str, Enum):
    """The 'yardstick' — how value is measured."""
    PROCEEDS = "proceeds"                      # "proceeds received", "gross proceeds"
    GROSS_VALUE_RECEIVED = "gross_value_received"
    AMOUNT_REALIZED = "amount_realized"
    MARKET_VALUE = "market_value"
    UNKNOWN = "unknown"


class ValuationPoint(str, Enum):
    """The 'location' — where value is measured."""
    AT_THE_WELL = "at_the_well"
    POINT_OF_SALE = "point_of_sale"
    FIRST_PURCHASER = "first_purchaser"
    UNKNOWN = "unknown"


class DeductionRuling(str, Enum):
    NOT_ALLOWED = "deductions_not_allowed"
    ALLOWED = "deductions_allowed"
    UNCLEAR = "unclear_manual_review_required"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class LeaseClause:
    """One clause's extracted fields — either the base lease or an addendum."""
    valuation_method: ValuationMethod
    valuation_point: ValuationPoint
    raw_text: str = ""


@dataclass
class LeaseFields:
    """
    The complete structured extraction from a single lease, ready for
    classification. This is the schema the document-extraction step
    (OCR + LLM, human-verified) must populate.
    """
    royalty_fraction: float                 # e.g. 0.1875 for 3/16
    base_clause: LeaseClause
    addendum_clause: Optional[LeaseClause] = None
    addendum_has_superseding_language: bool = False
    no_deductions_clause_present: bool = False
    no_deductions_clause_text: str = ""
    add_back_provision_present: bool = False
    add_back_provision_text: str = ""
    lease_date: Optional[str] = None
    well_api_number: Optional[str] = None


@dataclass
class ClassificationResult:
    ruling: DeductionRuling
    confidence: ConfidenceLevel
    governing_clause: str               # "base_lease" or "addendum"
    governing_method: ValuationMethod
    governing_point: ValuationPoint
    notes: list = field(default_factory=list)
    flags: list = field(default_factory=list)
    citation: str = ""


# Methods/points that, per case law, mean "proceeds-type" language
_PROCEEDS_LIKE_METHODS = {
    ValuationMethod.PROCEEDS,
    ValuationMethod.GROSS_VALUE_RECEIVED,
    ValuationMethod.AMOUNT_REALIZED,
}

_SALE_POINT_LIKE = {
    ValuationPoint.POINT_OF_SALE,
    ValuationPoint.FIRST_PURCHASER,
}


def _resolve_governing_clause(fields: LeaseFields) -> tuple[LeaseClause, str]:
    """
    Step 1 of the decision tree: determine whether the base lease or an
    addendum controls. Per BlueStone v. Randle (2021), when an addendum's
    superseding clause is triggered by a genuine conflict between the
    addendum and the base lease, the addendum governs.
    """
    if fields.addendum_clause is not None and fields.addendum_has_superseding_language:
        addendum = fields.addendum_clause
        base = fields.base_clause
        conflict = (
            addendum.valuation_method != base.valuation_method
            or addendum.valuation_point != base.valuation_point
        )
        if conflict:
            return addendum, "addendum"
        return base, "base_lease"
    return fields.base_clause, "base_lease"


def classify_deduction_rule(fields: LeaseFields) -> ClassificationResult:
    """
    Main entry point. Applies the full decision tree to determine whether
    post-production cost deductions are legally permitted under this lease,
    returning a ruling, a confidence level, and citable notes — never a
    silent guess.
    """
    notes: list[str] = []
    flags: list[str] = []

    governing_clause, clause_source = _resolve_governing_clause(fields)
    method = governing_clause.valuation_method
    point = governing_clause.valuation_point

    ruling = DeductionRuling.UNCLEAR
    confidence = ConfidenceLevel.LOW
    citation = ""

    # --- Step 2: apply method + point combination ---
    if method in _PROCEEDS_LIKE_METHODS:
        if point in _SALE_POINT_LIKE:
            ruling = DeductionRuling.NOT_ALLOWED
            confidence = ConfidenceLevel.HIGH
            citation = "Judice v. Mewbourne Oil Co.; BlueStone Nat. Res. II v. Randle"
            notes.append(
                "Proceeds-type valuation method combined with a point-of-sale "
                "valuation point. Texas courts have held this means no "
                "adjustment for post-production costs."
            )
        elif point == ValuationPoint.AT_THE_WELL:
            ruling = DeductionRuling.ALLOWED
            confidence = ConfidenceLevel.MEDIUM
            citation = "Heritage Resources, Inc. v. NationsBank"
            notes.append(
                "Proceeds-type language paired with an 'at the well' valuation "
                "point. Per Heritage Resources, proceeds language alone does not "
                "override a wellhead valuation point; the netback method may apply."
            )
        else:
            ruling = DeductionRuling.UNCLEAR
            confidence = ConfidenceLevel.LOW
            flags.append(
                "Valuation point could not be confidently classified. "
                "Proceeds-type method present but location of sale is ambiguous "
                "in the extracted lease text. Manual review required."
            )

    elif method == ValuationMethod.MARKET_VALUE:
        if point == ValuationPoint.AT_THE_WELL:
            ruling = DeductionRuling.ALLOWED
            confidence = ConfidenceLevel.HIGH
            citation = "Heritage Resources, Inc. v. NationsBank"
            notes.append(
                "Market value at the well. Netback method applies; "
                "post-production deductions are generally permitted."
            )
        elif point in _SALE_POINT_LIKE:
            ruling = DeductionRuling.NOT_ALLOWED
            confidence = ConfidenceLevel.MEDIUM
            notes.append(
                "Market value valuation point fixed at the point of sale. "
                "Valuation already occurs downstream of production costs."
            )
        else:
            ruling = DeductionRuling.UNCLEAR
            confidence = ConfidenceLevel.LOW
            flags.append(
                "Market value method present but valuation point is ambiguous. "
                "Manual review required."
            )
    else:
        ruling = DeductionRuling.UNCLEAR
        confidence = ConfidenceLevel.LOW
        flags.append(
            "Valuation method could not be confidently classified from the "
            "extracted lease text. This often happens with non-standard or "
            "highly negotiated lease language. Route to manual attorney review."
        )

    # --- Step 3: no-deductions clause is informational only ---
    if fields.no_deductions_clause_present:
        notes.append(
            "A 'no deductions' clause is present in this lease. Per Heritage "
            "Resources, this does NOT automatically override an 'at the well' "
            "valuation point — the ruling above already accounts for this."
        )

    # --- Step 4: add-back provision always escalates to manual review ---
    if fields.add_back_provision_present:
        confidence = ConfidenceLevel.LOW
        flags.append(
            "Add-back provision detected. Per Devon Energy Prod. Co. v. Sheppard, "
            "this is a narrow, fact-specific holding that may entitle the owner "
            "to MORE than a standard gross proceeds calculation. "
            "Do not rely on the automated ruling alone — route to attorney review."
        )

    return ClassificationResult(
        ruling=ruling,
        confidence=confidence,
        governing_clause=clause_source,
        governing_method=method,
        governing_point=point,
        notes=notes,
        flags=flags,
        citation=citation,
    )
