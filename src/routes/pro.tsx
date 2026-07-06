import { createFileRoute, redirect } from "@tanstack/react-router";

// Pro is parked (docs/15-access-and-waitlist-plan.md): the billing plumbing
// stays wired on the Stripe test key, but the upgrade page is retired. The
// route survives because old links and the Stripe return URLs point here.
// If a checkout ever completes, the webhook still syncs entitlement.
export const Route = createFileRoute("/pro")({
  beforeLoad: () => {
    throw redirect({ to: "/waitlist" });
  },
});
