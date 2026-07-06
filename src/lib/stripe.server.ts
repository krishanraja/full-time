// Server-only Stripe client. The .server.ts suffix keeps it out of the client
// bundle. Load lazily inside server handlers:
//   const { getStripe, proPriceId } = await import("@/lib/stripe.server");
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    _stripe = new Stripe(key, { appInfo: { name: "full-time" } });
  }
  return _stripe;
}

export function proPriceId(): string {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id) throw new Error("Missing STRIPE_PRO_PRICE_ID");
  return id;
}
