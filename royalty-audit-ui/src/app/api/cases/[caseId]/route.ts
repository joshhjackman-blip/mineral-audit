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
    .select("*")
    .eq("id", caseId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Gate: only return full data if paid
  if (data.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment required" }, { status: 403 });
  }

  return NextResponse.json(data);
}
