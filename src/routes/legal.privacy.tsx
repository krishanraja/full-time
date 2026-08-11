import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/legal/privacy")({
  head: () =>
    pageSeo({
      path: "/legal/privacy",
      title: "Privacy • Full Time",
      description: "How Full Time handles your data.",
    }),
  component: () => (
    <article className="prose prose-invert py-6 text-sm leading-relaxed">
      <Link
        to="/settings"
        className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        ← Back
      </Link>
      <div className="eyebrow mt-4">Legal</div>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Privacy</h1>
      <p className="mt-4 text-muted-foreground">
        Full Time stores only what we need to run the preview and remember your choices. If you sign
        in, we keep your email, the teams you follow, and your AI Pundit preference. If you opt in
        to push notifications, we store the device endpoint we need to send them. If you join the
        waitlist for the full app, we store when you joined so we can admit the list in order.
      </p>
      <p className="mt-3 text-muted-foreground">
        We do not sell your data. Product analytics from PostHog tell us which shows people start,
        finish, or have trouble playing. It sets a first-party cookie so a returning visitor counts
        once.
      </p>
      <p className="mt-3 text-muted-foreground">
        Want your data deleted? Sign out and email support. We will remove your account on request.
      </p>
    </article>
  ),
});
