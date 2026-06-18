// Typed helpers for reading and writing case rows.
// All server-side — never imported from a client component directly.

export type PaymentStatus = "pending" | "unpaid" | "paid";

export interface CaseRow {
  id: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  lease_name: string;
  operator_name: string;
  county_name: string;
  district_no: string;
  lease_no: string;
  api_number: string | null;
  royalty_fraction: string | null;
  decimal_interest: string | null;
  lease_date: string | null;
  audit_period_start: string | null;
  audit_period_end: string | null;
  additional_notes: string | null;
  payment_status: PaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  extraction_notes: string | null;
  lease_fields: unknown | null;
  classification: unknown | null;
  monthly_results: unknown | null;
  variance_detected: boolean | null;
  confidence_level: string | null;
  total_variance_cents: number | null;
  months_reviewed: number | null;
  earliest_sol_deadline: string | null;
}

export interface CaseSummary {
  id: string;
  lease_name: string;
  operator_name: string;
  variance_detected: boolean | null;
  confidence_level: string | null;
  total_variance_cents: number | null;
  months_reviewed: number | null;
  earliest_sol_deadline: string | null;
  payment_status: PaymentStatus;
}
