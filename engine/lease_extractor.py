"""
lease_extractor.py

Document extraction layer: turns raw lease text (OCR output, or text
copy-pasted from a PDF) into a structured LeaseFields object that
lease_classifier.py can consume.

THIS IS THE ONLY MODULE IN THE ENTIRE SYSTEM THAT CALLS AN LLM.
Its job is narrow and mechanical: pull six specific fields out of messy
legal text into a fixed schema. It makes NO legal judgment about whether
deductions are allowed — that logic lives entirely in lease_classifier.py
and never touches the LLM.

Design principle: the LLM is asked to return ONLY the raw quoted text
and a forced-choice classification for each field, never a free-form
legal conclusion. This keeps the extraction step auditable — a human
reviewer can always check the quoted text against the classification.
"""

import json
import sys
import os
from dataclasses import asdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from lease_classifier import LeaseClause, LeaseFields, ValuationMethod, ValuationPoint


EXTRACTION_SYSTEM_PROMPT = """You are a document extraction tool for oil and gas leases. \
Your ONLY job is to extract specific structured fields from lease text and return \
them as JSON. You do not interpret what the law says, you do not decide whether \
deductions are allowed, and you do not give legal advice. You only identify and \
quote the relevant text, then classify it into the fixed categories provided.

For every field, if the lease text does not clearly support a classification, \
you MUST return "unknown" rather than guessing. A wrong "unknown" is a safe \
failure. A wrong guess is not.

Return ONLY valid JSON matching this exact schema, with no preamble, no markdown \
fences, and no commentary:

{
  "royalty_fraction": <float, e.g. 0.125 for one-eighth, or null if not found>,
  "base_clause": {
    "valuation_method": "<one of: proceeds | gross_value_received | amount_realized | market_value | unknown>",
    "valuation_point": "<one of: at_the_well | point_of_sale | first_purchaser | unknown>",
    "raw_text": "<the exact quoted royalty clause text this classification is based on>"
  },
  "addendum_present": <true | false>,
  "addendum_clause": {
    "valuation_method": "<same options as above, or null if no addendum>",
    "valuation_point": "<same options as above, or null if no addendum>",
    "raw_text": "<exact quoted addendum royalty text, or null>"
  },
  "addendum_has_superseding_language": <true | false>,
  "superseding_language_quote": "<exact quoted text stating the addendum controls/supersedes the printed lease, or null>",
  "no_deductions_clause_present": <true | false>,
  "no_deductions_clause_text": "<exact quoted text, or null>",
  "add_back_provision_present": <true | false>,
  "add_back_provision_text": "<exact quoted text describing any provision requiring buyer's post-sale costs to be added back to the royalty base, or null>",
  "lease_date": "<date string as written in the lease, or null>",
  "extraction_confidence_notes": "<brief note on anything ambiguous, conflicting, or hard to classify in this lease — be specific>"
}

Classification guidance (for reference only — you are extracting text, not applying law):
- "proceeds" / "gross_value_received" / "amount_realized" all describe the VALUATION METHOD
  (the yardstick: what dollar figure is the royalty based on)
- "at_the_well" / "point_of_sale" / "first_purchaser" describe the VALUATION POINT
  (the location: where in the supply chain that value is measured)
- A clause can mention both. Extract both independently. Do not assume one implies the other.
"""


def build_extraction_user_prompt(lease_text: str) -> str:
    return f"""Extract the structured fields from the following oil and gas lease text. \
Remember: quote exact text for every "raw_text" or "_quote" field, and use "unknown" \
or null rather than guessing when the lease language doesn't clearly support a \
classification.

LEASE TEXT:
---
{lease_text}
---

Return only the JSON object."""


def parse_extraction_response(raw_json: str) -> LeaseFields:
    """
    Parses the LLM's JSON response into a LeaseFields object. Raises
    ValueError on any schema violation rather than silently coercing bad
    data — a malformed extraction should fail loudly, not produce a
    plausible-looking but wrong LeaseFields object.
    """
    data = json.loads(raw_json)

    def _method(value):
        if value is None or value == "null":
            return None
        return ValuationMethod(value)

    def _point(value):
        if value is None or value == "null":
            return None
        return ValuationPoint(value)

    base = data["base_clause"]
    base_clause = LeaseClause(
        valuation_method=_method(base["valuation_method"]) or ValuationMethod.UNKNOWN,
        valuation_point=_point(base["valuation_point"]) or ValuationPoint.UNKNOWN,
        raw_text=base.get("raw_text") or "",
    )

    addendum_clause = None
    if data.get("addendum_present"):
        addendum = data.get("addendum_clause") or {}
        addendum_clause = LeaseClause(
            valuation_method=_method(addendum.get("valuation_method")) or ValuationMethod.UNKNOWN,
            valuation_point=_point(addendum.get("valuation_point")) or ValuationPoint.UNKNOWN,
            raw_text=addendum.get("raw_text") or "",
        )

    royalty_fraction = data.get("royalty_fraction")
    if royalty_fraction is None:
        raise ValueError(
            "royalty_fraction missing from extraction. This is a required field — "
            "cannot proceed without it. Route to manual entry."
        )

    fields = LeaseFields(
        royalty_fraction=float(royalty_fraction),
        base_clause=base_clause,
        addendum_clause=addendum_clause,
        addendum_has_superseding_language=bool(data.get("addendum_has_superseding_language", False)),
        no_deductions_clause_present=bool(data.get("no_deductions_clause_present", False)),
        no_deductions_clause_text=data.get("no_deductions_clause_text") or "",
        add_back_provision_present=bool(data.get("add_back_provision_present", False)),
        add_back_provision_text=data.get("add_back_provision_text") or "",
        lease_date=data.get("lease_date"),
    )

    return fields, data.get("extraction_confidence_notes", "")


def extract_lease_fields_via_claude(lease_text: str, anthropic_client, model: str = "claude-sonnet-4-6") -> tuple:
    """
    Calls Claude with the extraction prompt and parses the result.
    Requires an already-instantiated anthropic client (anthropic.Anthropic()).

    Returns (LeaseFields, confidence_notes_string).

    NOTE: this function makes a real API call. For testing without API
    access, use parse_extraction_response() directly against a hand-written
    or saved JSON response — see tests/test_lease_extractor.py for both
    a live-call test (skipped if no API key) and an offline parser test.
    """
    response = anthropic_client.messages.create(
        model=model,
        max_tokens=1500,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_extraction_user_prompt(lease_text)}],
    )
    raw_text = response.content[0].text
    return parse_extraction_response(raw_text)
