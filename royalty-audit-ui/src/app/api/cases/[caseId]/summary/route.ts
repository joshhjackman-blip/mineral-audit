import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, lease_name, operator_name, variance_detected, confidence_level, total_variance_cents, months_reviewed, earliest_sol_deadline, payment_status"
    )
    .eq("id", caseId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
