import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Lazy singletons so module load doesn't crash when env vars are absent
// (e.g. during `next build` page-data collection). Real env values are
// resolved at first call, which happens at request time.

let _stripeServer: Stripe | undefined;

// Server-side Stripe instance
export function getServerStripe(): Stripe {
  if (!_stripeServer) {
    _stripeServer = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripeServer;
}

// Browser-side Stripe promise
let stripePromise: ReturnType<typeof loadStripe>;
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
