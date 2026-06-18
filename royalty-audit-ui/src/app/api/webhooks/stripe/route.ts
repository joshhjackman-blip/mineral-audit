import { NextRequest, NextResponse } from "next/server";
import { getServerStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import Stripe from "stripe";

// Stripe requires the raw request body for signature verification.
// Next.js App Router gives us access to it via req.text().
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getServerStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const caseId = session.metadata?.caseId;

    if (!caseId) {
      console.error("Webhook: no caseId in session metadata", session.id);
      return NextResponse.json({ error: "No caseId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cases")
      .update({
        payment_status: "paid",
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    if (error) {
      console.error("Webhook: failed to update case payment status:", error);
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    console.log(`Case ${caseId} marked as paid via session ${session.id}`);
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.log(`Payment failed for intent ${intent.id}`);
    // No action needed for now — case stays unpaid, owner can retry
  }

  return NextResponse.json({ received: true });
}
