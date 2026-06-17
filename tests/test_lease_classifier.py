"""
test_lease_classifier.py

Validates the classification engine against the fact patterns of the
actual Texas Supreme Court cases the rules are derived from. If these
tests pass, the engine's logic matches settled law for these patterns.
This is the test suite a CPL or attorney should be able to read and verify
line by line.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))

from lease_classifier import (
    LeaseClause,
    LeaseFields,
    ValuationMethod,
    ValuationPoint,
    DeductionRuling,
    ConfidenceLevel,
    classify_deduction_rule,
)


def test_heritage_resources_market_value_at_well_allows_deductions():
    """
    Heritage Resources, Inc. v. NationsBank (Tex. 1996):
    Market value at the well + a no-deductions clause. Held: deductions
    ARE allowed because the no-deductions clause does not override the
    wellhead valuation point.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.MARKET_VALUE,
            valuation_point=ValuationPoint.AT_THE_WELL,
            raw_text="market value at the well",
        ),
        no_deductions_clause_present=True,
        no_deductions_clause_text="free of cost",
    )
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.ALLOWED
    assert result.confidence == ConfidenceLevel.HIGH
    assert "Heritage" in result.citation
    print("PASS: Heritage Resources fact pattern -> deductions allowed")


def test_judice_gross_proceeds_disallows_deductions():
    """
    Judice v. Mewbourne Oil Co. (Tex. 1996):
    Gross proceeds received by lessee. Held: NO deductions, royalty is
    based on the gross price received.
    """
    fields = LeaseFields(
        royalty_fraction=0.25,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
            raw_text="gross proceeds received by lessee",
        ),
    )
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.NOT_ALLOWED
    assert result.confidence == ConfidenceLevel.HIGH
    print("PASS: Judice v. Mewbourne fact pattern -> deductions not allowed")


def test_bluestone_addendum_supersedes_base_lease():
    """
    BlueStone Nat. Res. II v. Randle (Tex. 2021):
    Base lease is 'at the well', but an addendum with superseding language
    uses 'gross value received'. Held: the addendum's proceeds clause
    conflicts with and SUPERSEDES the at-the-well base clause, so no
    deductions are allowed.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.MARKET_VALUE,
            valuation_point=ValuationPoint.AT_THE_WELL,
            raw_text="market value at the well",
        ),
        addendum_clause=LeaseClause(
            valuation_method=ValuationMethod.GROSS_VALUE_RECEIVED,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
            raw_text="gross value received by lessee with no deductions",
        ),
        addendum_has_superseding_language=True,
    )
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.NOT_ALLOWED
    assert result.governing_clause == "addendum"
    print("PASS: BlueStone v. Randle fact pattern -> addendum governs, deductions not allowed")


def test_addendum_without_conflict_defers_to_base_lease():
    """
    Sanity check: if an addendum exists but does NOT actually conflict
    with the base lease (same method, same point), the base lease should
    still be cited as governing, since there's no real conflict to resolve.
    """
    fields = LeaseFields(
        royalty_fraction=0.20,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.POINT_OF_SALE,
        ),
        addendum_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.POINT_OF_SALE,
        ),
        addendum_has_superseding_language=True,
    )
    result = classify_deduction_rule(fields)
    assert result.governing_clause == "base_lease"
    assert result.ruling == DeductionRuling.NOT_ALLOWED
    print("PASS: non-conflicting addendum -> base lease still cited as governing")


def test_devon_sheppard_add_back_flags_for_manual_review():
    """
    Devon Energy Prod. Co. v. Sheppard (Tex. 2023):
    A narrow add-back provision can entitle the owner to MORE than gross
    proceeds. This is fact-specific and should ALWAYS escalate to manual
    review rather than being confidently calculated.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.PROCEEDS,
            valuation_point=ValuationPoint.FIRST_PURCHASER,
        ),
        add_back_provision_present=True,
        add_back_provision_text="buyer's post-sale costs shall be added back to proceeds",
    )
    result = classify_deduction_rule(fields)
    assert result.confidence == ConfidenceLevel.LOW
    assert any("Devon" in flag for flag in result.flags)
    print("PASS: Devon v. Sheppard fact pattern -> flagged for manual review, low confidence")


def test_ambiguous_method_returns_unclear_not_a_guess():
    """
    If the valuation method can't be classified, the engine must say
    UNCLEAR rather than defaulting to either ruling. This is the
    anti-wrapper guarantee: no confident answer without a real basis.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.UNKNOWN,
            valuation_point=ValuationPoint.UNKNOWN,
        ),
    )
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.UNCLEAR
    assert result.confidence == ConfidenceLevel.LOW
    assert len(result.flags) > 0
    print("PASS: ambiguous lease language -> UNCLEAR, not a guessed ruling")


def test_market_value_point_of_sale_disallows_deductions():
    """
    Market value method, but valuation point fixed at point of sale rather
    than at the well — valuation already happens downstream of production
    costs, so deductions should not apply.
    """
    fields = LeaseFields(
        royalty_fraction=0.1875,
        base_clause=LeaseClause(
            valuation_method=ValuationMethod.MARKET_VALUE,
            valuation_point=ValuationPoint.POINT_OF_SALE,
        ),
    )
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.NOT_ALLOWED
    print("PASS: market value at point of sale -> deductions not allowed")


if __name__ == "__main__":
    tests = [
        test_heritage_resources_market_value_at_well_allows_deductions,
        test_judice_gross_proceeds_disallows_deductions,
        test_bluestone_addendum_supersedes_base_lease,
        test_addendum_without_conflict_defers_to_base_lease,
        test_devon_sheppard_add_back_flags_for_manual_review,
        test_ambiguous_method_returns_unclear_not_a_guess,
        test_market_value_point_of_sale_disallows_deductions,
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
