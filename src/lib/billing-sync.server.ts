// Server-only: map a Stripe subscription onto a profile's entitlement columns.
// Shared by the webhook route and the post-checkout sync server fn so both
// write entitlement identically. Runs with the service-role client, which is
// the only role allowed past the profiles billing guard.
import type Stripe from "stripe";

type Admin = {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id?: string } | null }> } };
    update: (patch: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
  };
};

// Stripe moved the paid period onto subscription items in newer API versions;
// read the item level first, fall back to the subscription level.
function periodEndIso(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const secs = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

export async function applySubscriptionToProfile(
  admin: Admin,
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<string> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const status = sub.status; // active|trialing|past_due|canceled|unpaid|incomplete|incomplete_expired|paused
  const isActive = status === "active" || status === "trialing";
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;

  // Resolve the owning user: subscription metadata first, then the customer we
  // stored at checkout time, then the Stripe customer's own metadata.
  let userId = sub.metadata?.user_id as string | undefined;
  if (!userId) {
    const { data } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.id;
  }
  if (!userId) {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !("deleted" in cust && cust.deleted)) {
      userId = (cust as Stripe.Customer).metadata?.user_id;
    }
  }
  if (!userId) {
    throw new Error(`Cannot resolve user for subscription ${sub.id} (customer ${customerId})`);
  }

  const patch = {
    plan: isActive ? "pro" : "free",
    subscription_status: status,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    current_period_end: periodEndIso(sub),
    price_id: priceId,
  };
  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
  return userId;
}
