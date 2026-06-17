"""
rrc_parser.py

Parser for the Texas Railroad Commission's Production Data Query Dump,
specifically the OG_LEASE_CYCLE table — lease-level monthly production
data, which is the table this project actually needs.

THIS MODULE CONTAINS ZERO LLM CALLS. It is a pure data transformation
layer: raw RRC export rows in, ProductionRecord objects (as defined in
royalty_calculator.py) out.

Source format, per the RRC's official PDQ Dump User Manual
(pdq-dump-user-manual.pdf):
  - Export format: delimited text, "}" as the delimiter
  - Header row included
  - File name pattern: OG_LEASE_CYCLE_DATA_TABLE.dsv
  - Schema: PDQ_OWNR or PDQ_CLNR
  - Delivered monthly (file size >25GB uncompressed, ~5GB compressed),
    via flash drive or cloud delivery on request — NOT a simple public
    HTTPS download link. Requesting it requires contacting
    digital@rrc.texas.gov (see docs/rrc_data_request.md).

Real OG_LEASE_CYCLE columns we rely on (from the official data dictionary):
  OIL_GAS_CODE          - 'O' or 'G'
  DISTRICT_NO           - RRC district (2-char)
  LEASE_NO              - RRC lease number, unique within district
  CYCLE_YEAR            - production year, YYYY
  CYCLE_MONTH           - production month, MM
  CYCLE_YEAR_MONTH      - YYYYMM
  LEASE_OIL_PROD_VOL    - oil produced, BBL, by lease, for the cycle
  LEASE_GAS_PROD_VOL    - gas produced, MCF, by lease, for the cycle
  LEASE_NAME            - lease name
  OPERATOR_NAME         - operator name
  FIELD_NAME            - field name
  PROD_REPORT_FILED_FLAG- whether a production report was actually filed

Note: OG_LEASE_CYCLE does NOT include price. RRC production data is
volume-only — price has to come from the owner's check stub / 1099, or
a market index. This module produces ProductionRecord objects with
volume populated and price left for the caller to attach.
"""

import csv
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional


RRC_DELIMITER = "}"

# Real column names from the OG_LEASE_CYCLE table, per the official
# PDQ Dump User Manual data dictionary.
EXPECTED_COLUMNS = {
    "OIL_GAS_CODE",
    "DISTRICT_NO",
    "LEASE_NO",
    "CYCLE_YEAR",
    "CYCLE_MONTH",
    "CYCLE_YEAR_MONTH",
    "LEASE_NO_DISTRICT_NO",
    "OPERATOR_NO",
    "FIELD_NO",
    "FIELD_TYPE",
    "GAS_WELL_NO",
    "PROD_REPORT_FILED_FLAG",
    "LEASE_OIL_PROD_VOL",
    "LEASE_OIL_ALLOW",
    "LEASE_OIL_ENDING_BAL",
    "LEASE_GAS_PROD_VOL",
    "LEASE_GAS_ALLOW",
    "LEASE_GAS_LIFT_INJ_VOL",
    "LEASE_COND_PROD_VOL",
    "LEASE_COND_LIMIT",
    "LEASE_COND_ENDING_BAL",
    "LEASE_CSGD_PROD_VOL",
    "LEASE_CSGD_LIMIT",
    "LEASE_CSGD_GAS_LIFT",
    "LEASE_OIL_TOT_DISP",
    "LEASE_GAS_TOT_DISP",
    "LEASE_COND_TOT_DISP",
    "LEASE_CSGD_TOT_DISP",
    "DISTRICT_NAME",
    "LEASE_NAME",
    "OPERATOR_NAME",
    "FIELD_NAME",
}


class RRCParseError(Exception):
    """Raised when the input file doesn't match the documented RRC schema."""
    pass


@dataclass
class RRCLeaseCycleRecord:
    """
    A single parsed row from OG_LEASE_CYCLE — one lease, one production
    month. This is an intermediate representation; use
    to_production_records() to convert it into the ProductionRecord
    objects the calculation engine actually consumes.
    """
    oil_gas_code: str
    district_no: str
    lease_no: str
    cycle_year: int
    cycle_month: int
    lease_oil_prod_vol: Optional[Decimal]
    lease_gas_prod_vol: Optional[Decimal]
    lease_name: str
    operator_name: str
    field_name: str
    prod_report_filed_flag: Optional[str]

    @property
    def period(self) -> date:
        return date(self.cycle_year, self.cycle_month, 1)

    @property
    def rrc_lease_key(self) -> str:
        """
        District + lease number is how the RRC uniquely identifies a
        lease — LEASE_NO alone is only unique *within* a district.
        This is the key to match against an owner's division order.
        """
        return f"{self.district_no}-{self.lease_no}"


def _parse_decimal(value: str) -> Optional[Decimal]:
    value = (value or "").strip()
    if value == "":
        return None
    try:
        return Decimal(value)
    except Exception:
        raise RRCParseError(f"Could not parse numeric field value: {value!r}")


def _parse_int(value: str, field_name: str) -> int:
    value = (value or "").strip()
    if value == "":
        raise RRCParseError(f"Required field {field_name} was empty")
    try:
        return int(value)
    except ValueError:
        raise RRCParseError(f"Could not parse {field_name} as integer: {value!r}")


def parse_og_lease_cycle_file(file_path: str) -> list[RRCLeaseCycleRecord]:
    """
    Parses an OG_LEASE_CYCLE_DATA_TABLE.dsv file (the real RRC export
    format: "}" delimited, header row included) into a list of
    RRCLeaseCycleRecord objects.

    Raises RRCParseError if the file's header doesn't match the expected
    OG_LEASE_CYCLE schema — this is a deliberate fail-loud check, since a
    silently misparsed government data file is far worse than a clear
    error telling you the format changed.
    """
    records: list[RRCLeaseCycleRecord] = []

    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=RRC_DELIMITER)

        header_columns = set(reader.fieldnames or [])
        missing = {"OIL_GAS_CODE", "DISTRICT_NO", "LEASE_NO", "CYCLE_YEAR", "CYCLE_MONTH"} - header_columns
        if missing:
            raise RRCParseError(
                f"File does not match expected OG_LEASE_CYCLE schema. "
                f"Missing required columns: {missing}. "
                f"Found columns: {header_columns}. "
                f"This likely means the wrong file was provided, or the RRC "
                f"has changed their export format — check against the "
                f"current PDQ Dump User Manual before proceeding."
            )

        for row_num, row in enumerate(reader, start=2):  # start=2: header is line 1
            try:
                record = RRCLeaseCycleRecord(
                    oil_gas_code=row["OIL_GAS_CODE"].strip(),
                    district_no=row["DISTRICT_NO"].strip(),
                    lease_no=row["LEASE_NO"].strip(),
                    cycle_year=_parse_int(row["CYCLE_YEAR"], "CYCLE_YEAR"),
                    cycle_month=_parse_int(row["CYCLE_MONTH"], "CYCLE_MONTH"),
                    lease_oil_prod_vol=_parse_decimal(row.get("LEASE_OIL_PROD_VOL", "")),
                    lease_gas_prod_vol=_parse_decimal(row.get("LEASE_GAS_PROD_VOL", "")),
                    lease_name=(row.get("LEASE_NAME") or "").strip(),
                    operator_name=(row.get("OPERATOR_NAME") or "").strip(),
                    field_name=(row.get("FIELD_NAME") or "").strip(),
                    prod_report_filed_flag=(row.get("PROD_REPORT_FILED_FLAG") or "").strip() or None,
                )
                records.append(record)
            except RRCParseError as e:
                raise RRCParseError(f"Row {row_num}: {e}")

    return records


def find_lease_records(
    records: list[RRCLeaseCycleRecord],
    district_no: str,
    lease_no: str,
) -> list[RRCLeaseCycleRecord]:
    """
    Filters parsed records down to a single lease (district + lease
    number), sorted chronologically. This is the lookup an audit
    actually performs: owner provides district + lease number (usually
    printed on their division order), this returns every production
    month on file for it.
    """
    key = f"{district_no.strip()}-{lease_no.strip()}"
    matches = [r for r in records if r.rrc_lease_key == key]
    return sorted(matches, key=lambda r: r.period)


def lease_cycle_to_production_records(
    lease_records: list[RRCLeaseCycleRecord],
    price_lookup: dict,
) -> list:
    """
    Converts RRCLeaseCycleRecord objects (volume-only, no price — RRC
    doesn't report price) into the ProductionRecord objects the
    calculation engine consumes, attaching price from an owner-provided
    lookup (e.g. built from check stubs).

    price_lookup: dict mapping (year, month, commodity) -> Decimal price.
    Records with no matching price are skipped with a warning rather
    than silently defaulting to zero, since a $0 price would produce a
    silently wrong "no underpayment" result.

    Returns a list of (ProductionRecord, warning_or_none) tuples so the
    caller can see exactly which months couldn't be priced.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
    from royalty_calculator import ProductionRecord, Commodity

    results = []
    for rec in lease_records:
        if rec.oil_gas_code == "O" and rec.lease_oil_prod_vol is not None:
            price = price_lookup.get((rec.cycle_year, rec.cycle_month, Commodity.OIL))
            if price is None:
                results.append((None, f"No price available for oil, {rec.period.isoformat()} — skipped"))
            else:
                results.append((
                    ProductionRecord(
                        period=rec.period,
                        commodity=Commodity.OIL,
                        volume=rec.lease_oil_prod_vol,
                        reported_price=price,
                    ),
                    None,
                ))

        if rec.oil_gas_code == "G" and rec.lease_gas_prod_vol is not None:
            price = price_lookup.get((rec.cycle_year, rec.cycle_month, Commodity.GAS))
            if price is None:
                results.append((None, f"No price available for gas, {rec.period.isoformat()} — skipped"))
            else:
                results.append((
                    ProductionRecord(
                        period=rec.period,
                        commodity=Commodity.GAS,
                        volume=rec.lease_gas_prod_vol,
                        reported_price=price,
                    ),
                    None,
                ))

    return results
