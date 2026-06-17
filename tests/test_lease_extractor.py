"""
test_lease_extractor.py

Two kinds of tests here, deliberately separated:

1. OFFLINE tests (always run): validate parse_extraction_response()
   against hand-verified JSON, simulating what an LLM extraction call
   would return. These don't require API access and form the real
   regression suite.

2. LIVE test (skipped automatically if no ANTHROPIC_API_KEY is set):
   makes a real API call against the BlueStone sample lease and checks
   that the live extraction + classification pipeline still reaches the
   correct, case-law-verified outcome.

The BlueStone v. Randle (Tex. 2021) fact pattern is the single best test
case available: it has a base lease, a conflicting addendum, superseding
language, and a real, citable, decided outcome to check against. If the
pipeline gets this one right, that's strong evidence the extraction
schema and parser are sound.
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))

from lease_extractor import parse_extraction_response, build_extraction_user_prompt
from lease_classifier import classify_deduction_rule, DeductionRuling, ConfidenceLevel


_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def test_offline_parse_bluestone_extraction_reaches_correct_outcome():
    """
    The core regression test. Takes a verified extraction JSON (modeling
    what Claude returns for the BlueStone lease text) and confirms the
    full parse -> classify pipeline reaches NOT_ALLOWED with the addendum
    cited as governing — matching the actual Texas Supreme Court holding.
    """
    with open(os.path.join(_DATA_DIR, "sample_extraction_bluestone.json")) as f:
        raw_json = f.read()

    fields, notes = parse_extraction_response(raw_json)

    assert fields.royalty_fraction == 0.125
    assert fields.addendum_clause is not None
    assert fields.addendum_has_superseding_language is True

    result = classify_deduction_rule(fields)

    assert result.ruling == DeductionRuling.NOT_ALLOWED
    assert result.governing_clause == "addendum"
    assert "BlueStone" in result.citation
    print("PASS: BlueStone extraction -> parse -> classify pipeline matches real case outcome")
    print(f"  Extraction confidence note surfaced: {notes[:90]}...")


def test_offline_parser_rejects_missing_royalty_fraction():
    """
    Anti-wrapper guarantee at the parsing layer: if the LLM fails to
    extract a royalty fraction, the parser must raise rather than silently
    defaulting to some plausible-looking value.
    """
    bad_json = json.dumps({
        "royalty_fraction": None,
        "base_clause": {"valuation_method": "proceeds", "valuation_point": "at_the_well", "raw_text": "x"},
        "addendum_present": False,
    })
    try:
        parse_extraction_response(bad_json)
        assert False, "Expected ValueError for missing royalty_fraction"
    except ValueError as e:
        assert "royalty_fraction" in str(e)
        print("PASS: missing royalty_fraction correctly raises rather than guessing")


def test_offline_parser_handles_unknown_classifications_gracefully():
    """
    If the LLM correctly reports 'unknown' for an ambiguous clause, the
    parser should pass that through as UNKNOWN, which the classifier
    already knows how to route to manual review — not crash, not guess.
    """
    ambiguous_json = json.dumps({
        "royalty_fraction": 0.1875,
        "base_clause": {
            "valuation_method": "unknown",
            "valuation_point": "unknown",
            "raw_text": "such royalty as may be determined in accordance with industry custom"
        },
        "addendum_present": False,
    })
    fields, _ = parse_extraction_response(ambiguous_json)
    result = classify_deduction_rule(fields)
    assert result.ruling == DeductionRuling.UNCLEAR
    assert result.confidence == ConfidenceLevel.LOW
    print("PASS: genuinely ambiguous lease text -> UNCLEAR end to end, not a guess")


def test_live_extraction_against_bluestone_sample():
    """
    LIVE test — makes a real Claude API call. Skips automatically if no
    ANTHROPIC_API_KEY is present, since this is meant to be run manually
    when validating prompt changes, not as part of routine offline testing.
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("SKIP: test_live_extraction_against_bluestone_sample (no ANTHROPIC_API_KEY set)")
        return

    import anthropic
    from lease_extractor import extract_lease_fields_via_claude

    with open(os.path.join(_DATA_DIR, "sample_lease_bluestone.txt")) as f:
        lease_text = f.read()

    client = anthropic.Anthropic()
    fields, notes = extract_lease_fields_via_claude(lease_text, client)
    result = classify_deduction_rule(fields)

    assert result.ruling == DeductionRuling.NOT_ALLOWED, (
        f"Live extraction reached {result.ruling}, expected NOT_ALLOWED. "
        f"Review the prompt — this should match the real BlueStone v. Randle holding."
    )
    print(f"PASS (LIVE): real API extraction reached correct ruling: {result.ruling}")
    print(f"  Confidence: {result.confidence}, governing clause: {result.governing_clause}")
    print(f"  Notes: {notes}")


if __name__ == "__main__":
    tests = [
        test_offline_parse_bluestone_extraction_reaches_correct_outcome,
        test_offline_parser_rejects_missing_royalty_fraction,
        test_offline_parser_handles_unknown_classifications_gracefully,
        test_live_extraction_against_bluestone_sample,
    ]
    failures = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {t.__name__} -> {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests passed (live test auto-skips without API key).")
    if failures:
        sys.exit(1)
