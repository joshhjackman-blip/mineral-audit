import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      ownerName,
      ownerEmail,
      leaseName,
      operatorName,
      countyName,
      districtNo,
      leaseNo,
      apiNumber,
      royaltyFraction,
      decimalInterest,
      leaseDate,
      auditPeriodStart,
      auditPeriodEnd,
      additionalNotes,
    } = body;

    if (!ownerName || !ownerEmail || !leaseName || !operatorName || !countyName || !districtNo || !leaseNo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("cases")
      .insert({
        owner_name: ownerName,
        owner_email: ownerEmail,
        lease_name: leaseName,
        operator_name: operatorName,
        county_name: countyName,
        district_no: districtNo,
        lease_no: leaseNo,
        api_number: apiNumber || null,
        royalty_fraction: royaltyFraction || null,
        decimal_interest: decimalInterest || null,
        lease_date: leaseDate || null,
        audit_period_start: auditPeriodStart || null,
        audit_period_end: auditPeriodEnd || null,
        additional_notes: additionalNotes || null,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create case" },
        { status: 500 }
      );
    }

    return NextResponse.json({ caseId: data.id }, { status: 201 });
  } catch (err) {
    console.error("Cases POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
