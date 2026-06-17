// types.ts
// Mirrors engine/lease_classifier.py and engine/royalty_calculator.py exactly.
// This is a TypeScript model of the real Python domain — not a reinvention
// of it. Field names and enum values match 1:1 so that when the real
// extraction/classification API is wired in, no remapping is needed.

export type ValuationMethod =
  | "proceeds"
  | "gross_value_received"
  | "amount_realized"
  | "market_value"
  | "unknown";

export type ValuationPoint =
  | "at_the_well"
  | "point_of_sale"
  | "first_purchaser"
  | "unknown";

export type DeductionRuling =
  | "deductions_not_allowed"
  | "deductions_allowed"
  | "unclear_manual_review_required";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface LeaseClause {
  valuation_method: ValuationMethod;
  valuation_point: ValuationPoint;
  raw_text: string;
}

export interface LeaseFields {
  royalty_fraction: number;
  base_clause: LeaseClause;
  addendum_clause: LeaseClause | null;
  addendum_has_superseding_language: boolean;
  no_deductions_clause_present: boolean;
  no_deductions_clause_text: string;
  add_back_provision_present: boolean;
  add_back_provision_text: string;
  lease_date: string | null;
  well_api_number: string | null;
}

export interface ClassificationResult {
  ruling: DeductionRuling;
  confidence: ConfidenceLevel;
  governing_clause: "base_lease" | "addendum";
  governing_method: ValuationMethod;
  governing_point: ValuationPoint;
  notes: string[];
  flags: string[];
  citation: string;
}

export interface MonthlyAuditResult {
  period: string; // ISO date, first of month
  commodity: "oil" | "gas";
  expected_payment: number;
  actual_payment: number;
  variance: number; // expected - actual; positive = underpaid
  variance_pct: number | null;
  deductions_taken: number;
  deductions_allowed: boolean;
  payment_due_date: string;
  payment_was_late: boolean;
  days_late: number;
  statute_of_limitations_deadline: string;
  is_time_barred: boolean;
  flags: string[];
}

export interface CaseFile {
  id: string;
  ownerName: string;
  leaseName: string;
  districtNo: string;
  leaseNo: string;
  apiNumber: string | null;
  uploadedAt: string;
  extractionNotes: string;
  leaseFields: LeaseFields;
  classification: ClassificationResult;
  monthlyResults: MonthlyAuditResult[];
}

export function totalVariance(months: MonthlyAuditResult[]): number {
  return months.reduce((sum, m) => sum + m.variance, 0);
}

export function flaggedMonthCount(months: MonthlyAuditResult[]): number {
  return months.filter((m) => m.flags.length > 0).length;
}

export function methodLabel(m: ValuationMethod): string {
  switch (m) {
    case "proceeds":
      return "Proceeds";
    case "gross_value_received":
      return "Gross value received";
    case "amount_realized":
      return "Amount realized";
    case "market_value":
      return "Market value";
    default:
      return "Unknown";
  }
}

export function pointLabel(p: ValuationPoint): string {
  switch (p) {
    case "at_the_well":
      return "At the well";
    case "point_of_sale":
      return "Point of sale";
    case "first_purchaser":
      return "First purchaser";
    default:
      return "Unknown";
  }
}

export function rulingLabel(r: DeductionRuling): string {
  switch (r) {
    case "deductions_not_allowed":
      return "Deductions not allowed";
    case "deductions_allowed":
      return "Deductions allowed";
    default:
      return "Unclear — manual review required";
  }
}
