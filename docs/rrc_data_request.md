# RRC Production Data Access — Status & Notes

## What we confirmed

The Production Data Query Dump (the file we're targeting) is real, free,
and listed publicly at:
https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/

Per the official **PDQ Dump User Manual** (pdq-dump-user-manual.pdf, linked
from that page):

- It is a complete dump of the Production Data and Historical Ledger
  databases, covering production from 1993 to current.
- Export format: delimited text, **`}` as the delimiter** (not comma).
- Multiple tables are included; the one we actually need is
  **`OG_LEASE_CYCLE`** — lease-level monthly production by year/month.
- File size: large. >25GB uncompressed, compressed file no larger than ~5GB.
- **Delivery is NOT a simple public HTTPS download link.** The manual
  states delivery is monthly via portable flash drive or a cloud
  service (Hightail) "upon request," and that availability questions
  should go to Central Records at `digital@rrc.texas.gov`.

This is a meaningfully different situation than "click a link, get a
CSV." It's a free data request process, not a public file.

## What this means for the project right now

`engine/rrc_parser.py` is built and fully tested against the **real,
documented OG_LEASE_CYCLE schema** — actual column names, the real `}`
delimiter, and realistic edge cases (a delinquent/unfiled production
month, a missing price month). See `tests/test_rrc_parser.py`.

The synthetic test file (`data/sample_og_lease_cycle.dsv`) is built to
match this real format exactly. When a real file is obtained from the
RRC, it should drop in and work without changing the parser — assuming
the RRC hasn't changed their export schema since the manual was written,
which the parser checks for explicitly (`RRCParseError` if expected
columns are missing).

## Open item: actually requesting the data

A request has been drafted to `digital@rrc.texas.gov` asking specifically
for the OG_LEASE_CYCLE table in the documented delimited format, and
asking whether delivery now happens via the HTTPS migration mentioned
elsewhere on the RRC site (since the manual's flash-drive language may
be outdated).

Until that's resolved, the project continues to use the realistic
synthetic file for development and testing. Nothing about the engine,
classifier, or calculator depends on this — they're already fully
tested independent of where the data comes from.

## One more real constraint worth remembering

Per the RRC's own disclaimers: production reports reflect a two-month
lag (operators' reports are due the last day of the month for the
*previous* month), and preliminary figures can keep changing for **six
to eight months** after initial filing as corrected/late reports come
in. This means a given month's production figure isn't necessarily
"final" the moment it's pulled — worth building in a "preliminary vs.
settled" distinction at some point, rather than treating every RRC
figure as permanent on first read.
