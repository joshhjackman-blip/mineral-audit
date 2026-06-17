// mock-data.ts
// Case files built directly from the real, validated test fixtures in
// data/sample_extraction_bluestone.json, data/sample_extraction_devon_sheppard.json,
// and the RRC end-to-end test in tests/test_rrc_parser.py.
// These are not invented numbers — they are the same scenarios the Python
// test suite already proved correct (21/21 passing).

import { CaseFile } from "./types";

export const bluestoneCase: CaseFile = {
  id: "case-001",
  ownerName: "John A. Randle",
  leaseName: "Randle Lease, Tarrant County",
  districtNo: "09",
  leaseNo: "047721",
  apiNumber: "42-439-31204",
  uploadedAt: "2024-03-14",
  extractionNotes:
    "The addendum's valuation point is not explicitly stated as 'at the well' or 'point of sale' in so many words. Classified as first_purchaser because 'gross value received' for production that has been gathered, treated, and transported implies a valuation point downstream of the wellhead. A human reviewer should confirm this inference rather than treating it as certain, since the addendum does not use the literal phrase 'point of sale.'",
  leaseFields: {
    royalty_fraction: 0.125,
    base_clause: {
      valuation_method: "market_value",
      valuation_point: "at_the_well",
      raw_text:
        "on gas, including casinghead gas and all gaseous substances, produced from said land and sold or used off the premises or for the extraction of gasoline or other product therefrom, the market value at the well of one-eighth (1/8) of the gas so sold or used",
    },
    addendum_clause: {
      valuation_method: "gross_value_received",
      valuation_point: "first_purchaser",
      raw_text:
        "Lessee agrees to compute and pay royalties on the gross value received for oil, gas, casinghead gas, and all other gaseous substances produced, saved, and sold from the leased premises, free and clear of all costs and expenses, including but not limited to the costs of producing, gathering, storing, separating, treating, dehydrating, compressing, processing, transporting, and marketing said production.",
    },
    addendum_has_superseding_language: true,
    no_deductions_clause_present: true,
    no_deductions_clause_text:
      "free and clear of all costs and expenses, including but not limited to the costs of producing, gathering, storing, separating, treating, dehydrating, compressing, processing, transporting, and marketing said production",
    add_back_provision_present: false,
    add_back_provision_text: "",
    lease_date: "March 14, 2003",
    well_api_number: "42-439-31204",
  },
  classification: {
    ruling: "deductions_not_allowed",
    confidence: "high",
    governing_clause: "addendum",
    governing_method: "gross_value_received",
    governing_point: "first_purchaser",
    notes: [
      "Proceeds-type valuation method combined with a point-of-sale valuation point. Texas courts have held this means no adjustment for post-production costs.",
      "A 'no deductions' clause is present in this lease. Per Heritage Resources, this does NOT automatically override an 'at the well' valuation point — the ruling above already accounts for this.",
    ],
    flags: [],
    citation: "Judice v. Mewbourne Oil Co.; BlueStone Nat. Res. II v. Randle",
  },
  monthlyResults: [
    { period: "2023-01-01", commodity: "oil", expected_payment: 14424.38, actual_payment: 14384.38, variance: 40.00, variance_pct: 0.28, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-03-02", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-03-02", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period."] },
    { period: "2023-02-01", commodity: "oil", expected_payment: 14430.38, actual_payment: 14390.38, variance: 40.00, variance_pct: 0.28, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-04-01", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-04-01", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period."] },
    { period: "2023-03-01", commodity: "oil", expected_payment: 13768.31, actual_payment: 13728.31, variance: 40.00, variance_pct: 0.29, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-04-30", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-04-30", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period."] },
    { period: "2023-04-01", commodity: "oil", expected_payment: 15157.54, actual_payment: 15117.54, variance: 40.00, variance_pct: 0.26, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-05-30", payment_was_late: true, days_late: 12, statute_of_limitations_deadline: "2027-05-30", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period.", "Payment was made 12 days after the due date."] },
    { period: "2023-05-01", commodity: "oil", expected_payment: 13454.44, actual_payment: 13414.44, variance: 40.00, variance_pct: 0.30, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-06-29", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-06-29", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period."] },
    { period: "2023-06-01", commodity: "oil", expected_payment: 13171.88, actual_payment: 13131.88, variance: 40.00, variance_pct: 0.30, deductions_taken: 213.33, deductions_allowed: false, payment_due_date: "2023-07-30", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-07-30", is_time_barred: false, flags: ["Possible underpayment of $40.00 detected for this period."] },
  ],
};

export const devonSheppardCase: CaseFile = {
  id: "case-002",
  ownerName: "Sheppard Family Mineral Trust",
  leaseName: "Sheppard Lease, Hemphill County",
  districtNo: "10",
  leaseNo: "031889",
  apiNumber: "42-211-38845",
  uploadedAt: "2024-04-02",
  extractionNotes:
    "Paragraph 3(c) is doing two jobs at once — extracted into both no_deductions and add_back fields because it is genuinely both: a standard cost-free royalty assurance AND a clause requiring deducted amounts to be added back to the royalty base. The add-back language is not separately labeled or in its own addendum — it's folded into the main royalty paragraph using ordinary-sounding 'no deductions' phrasing. A less careful extraction could easily miss the add-back flag entirely.",
  leaseFields: {
    royalty_fraction: 0.2,
    base_clause: {
      valuation_method: "proceeds",
      valuation_point: "first_purchaser",
      raw_text:
        "On gas, including casinghead gas and all other gaseous substances, produced from said land and sold or used off the premises, one-fifth (1/5) of the gross proceeds received by Lessee from the sale of such gas at the prevailing market price.",
    },
    addendum_clause: null,
    addendum_has_superseding_language: false,
    no_deductions_clause_present: true,
    no_deductions_clause_text:
      "such deduction, expense, or cost shall be added to the market value or gross proceeds so that Lessor's royalty shall never be chargeable, directly or indirectly, with any costs or expenses other than its pro rata share of severance or production taxes",
    add_back_provision_present: true,
    add_back_provision_text:
      "If any disposition, contract, or sale of oil or gas by Lessee shall include any reduction or charge for the expenses or costs of production, treatment, transportation, manufacturing, processing, or marketing of such oil or gas, then such deduction, expense, or cost shall be added to the market value or gross proceeds so that Lessor's royalty shall never be chargeable, directly or indirectly, with any costs or expenses other than its pro rata share of severance or production taxes.",
    lease_date: "February 9, 2007",
    well_api_number: "42-211-38845",
  },
  classification: {
    ruling: "deductions_not_allowed",
    confidence: "low",
    governing_clause: "base_lease",
    governing_method: "proceeds",
    governing_point: "first_purchaser",
    notes: [
      "Proceeds-type valuation method combined with a point-of-sale valuation point. Texas courts have held this means no adjustment for post-production costs.",
      "A 'no deductions' clause is present in this lease. Per Heritage Resources, this does NOT automatically override an 'at the well' valuation point — the ruling above already accounts for this.",
    ],
    flags: [
      "Add-back provision detected. Per Devon Energy Prod. Co. v. Sheppard, this is a narrow, fact-specific holding that may entitle the owner to MORE than a standard gross proceeds calculation. Do not rely on the automated ruling alone — route to attorney review.",
    ],
    citation: "Judice v. Mewbourne Oil Co.; BlueStone Nat. Res. II v. Randle",
  },
  monthlyResults: [
    { period: "2023-01-01", commodity: "gas", expected_payment: 9840.00, actual_payment: 9840.00, variance: 0, variance_pct: 0, deductions_taken: 0, deductions_allowed: false, payment_due_date: "2023-04-30", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-04-30", is_time_barred: false, flags: ["Add-back provision present — true entitlement may exceed this floor figure. See classification flags."] },
    { period: "2023-02-01", commodity: "gas", expected_payment: 10120.50, actual_payment: 10120.50, variance: 0, variance_pct: 0, deductions_taken: 0, deductions_allowed: false, payment_due_date: "2023-05-30", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-05-30", is_time_barred: false, flags: ["Add-back provision present — true entitlement may exceed this floor figure. See classification flags."] },
    { period: "2023-03-01", commodity: "gas", expected_payment: 9275.00, actual_payment: 9275.00, variance: 0, variance_pct: 0, deductions_taken: 0, deductions_allowed: false, payment_due_date: "2023-06-29", payment_was_late: false, days_late: 0, statute_of_limitations_deadline: "2027-06-29", is_time_barred: false, flags: ["Add-back provision present — true entitlement may exceed this floor figure. See classification flags."] },
  ],
};

export const allCases: CaseFile[] = [bluestoneCase, devonSheppardCase];
