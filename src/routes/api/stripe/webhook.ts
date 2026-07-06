// Stripe webhook. Public endpoint; authenticity comes from the Stripe
// signature (STRIPE_WEBHOOK_SECRET), verified against the RAW body. Writes
// entitlement with the service-role client (the only role past the billing
// guard). Idempotent: every handler recomputes profile state from Stripe.
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!sig || !secret) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(`Bad signature: ${msg}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applySubscriptionToProfile } = await import("@/lib/billing-sync.server");

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
              if (subId) {
                const sub = await stripe.subscriptions.retrieve(subId);
                if (!sub.metadata?.user_id && session.client_reference_id) {
                  sub.metadata = { ...sub.metadata, user_id: session.client_reference_id };
                }
                await applySubscriptionToProfile(supabaseAdmin as never, stripe, sub);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await applySubscriptionToProfile(
                supabaseAdmin as never,
                stripe,
                event.data.object as Stripe.Subscription,
              );
              break;
            }
            case "invoice.paid":
            case "invoice.payment_failed": {
              const inv = event.data.object as unknown as { subscription?: string | { id: string } };
              const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
              if (subId) {
                const sub = await stripe.subscriptions.retrieve(subId);
                await applySubscriptionToProfile(supabaseAdmin as never, stripe, sub);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          // Transient (e.g. DB) failures: 500 so Stripe retries with backoff.
          console.error("[stripe webhook] handler error", event.type, err);
          return new Response("handler error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
