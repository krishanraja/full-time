import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isProProfile, type Entitlement, type Plan } from "@/lib/entitlement";

// Origin for Stripe redirect URLs: honour the forwarded host on Vercel, else env.
function getOrigin(): string {
  const req = getRequest();
  const h = req?.headers;
  const host = h?.get("x-forwarded-host") ?? h?.get("host");
  const proto = h?.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.APP_URL ?? "https://full-time-alpha.vercel.app";
}

// What the client uses to gate UI. Reads the caller's own profile under RLS.
export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Entitlement> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      plan: (data?.plan as Plan) ?? "free",
      isPro: isProProfile(data),
      status: data?.subscription_status ?? null,
      currentPeriodEnd: data?.current_period_end ?? null,
    };
  });

// Create a Stripe Checkout Session for Full Time Pro. Returns the hosted URL.
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { getStripe, proPriceId } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripe = getStripe();
    const userId = context.userId;
    const email = (context.claims?.email as string | undefined) ?? undefined;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    let customerId = (prof as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const origin = getOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: proPriceId(), quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: userId,
      subscription_data: { metadata: { user_id: userId } },
      success_url: `${origin}/pro?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pro?status=cancel`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  });

// Stripe billing portal (manage payment method / cancel). Returns the hosted URL.
export const createPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { getStripe } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripe = getStripe();
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const customerId = (prof as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) throw new Error("No billing account yet. Upgrade first.");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getOrigin()}/pro`,
    });
    return { url: session.url };
  });

// Belt-and-suspenders: reconcile entitlement straight from Stripe on the
// success page, so Pro reflects instantly even if the webhook is a beat behind.
export const syncCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; isPro: boolean }> => {
    const { getStripe } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applySubscriptionToProfile } = await import("@/lib/billing-sync.server");
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
      expand: ["subscription"],
    });
    if (session.client_reference_id && session.client_reference_id !== context.userId) {
      throw new Error("This checkout session does not belong to you.");
    }
    const sub = session.subscription;
    let isPro = false;
    if (sub && typeof sub !== "string") {
      if (!sub.metadata?.user_id) sub.metadata = { ...sub.metadata, user_id: context.userId };
      await applySubscriptionToProfile(supabaseAdmin as never, stripe, sub);
      isPro = sub.status === "active" || sub.status === "trialing";
    }
    return { ok: true, isPro };
  });
