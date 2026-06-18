import { NextRequest, NextResponse } from "next/server";
import { getServerStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json();

    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: caseRow, error: fetchError } = await supabase
      .from("cases")
      .select("id, owner_email, owner_name, lease_name, payment_status")
      .eq("id", caseId)
      .single();

    if (fetchError || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseRow.payment_status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await getServerStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: caseRow.owner_email,
      metadata: {
        caseId,
      },
      success_url: `${baseUrl}/case/${caseId}?payment=success`,
      cancel_url: `${baseUrl}/summary/${caseId}?payment=cancelled`,
    });

    await supabase
      .from("cases")
      .update({ stripe_session_id: session.id })
      .eq("id", caseId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Create checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
