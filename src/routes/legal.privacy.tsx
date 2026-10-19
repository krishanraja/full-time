import { createFileRoute, Link } from "@tanstack/react-router";
import { FEEDBACK_EMAIL } from "@/lib/feedback";
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
      <p className="mt-1 text-xs text-muted-foreground">Last updated: 19 October 2026</p>
      <p className="mt-4 text-muted-foreground">
        Full Time is operated by Mindmaker LLC, a United States company, and Mindmaker Ltd, a United
        Kingdom company (together, "Mindmaker", "we", "us").
      </p>
      <p className="mt-3 text-muted-foreground">
        Mindmaker LLC and Mindmaker Ltd are responsible for the personal information described in
        this policy.
      </p>
      <p className="mt-3 text-muted-foreground">
        Full Time stores only what we need to run the preview and remember your choices. If you sign
        in, we keep your email, the teams you follow, and your AI Pundit preference. If you opt in
        to push notifications, we store the device endpoint we need to send them. If you join the
        waitlist for the full app, we store when you joined so we can admit the list in order.
      </p>
      <p className="mt-3 text-muted-foreground">
        We do not sell your data. Product analytics from PostHog tell us which shows people start,
        finish, or have trouble playing. Google Analytics tells us which pages people visit and how
        they found us. Both set first-party cookies so a returning visitor counts once.
      </p>
      <p className="mt-3 text-muted-foreground">
        If you email us feedback, we keep your email address and your message so we can read it and
        reply.
      </p>
      <p className="mt-3 text-muted-foreground">
        Want your data deleted? Sign out and email{" "}
        <a href={`mailto:${FEEDBACK_EMAIL}`} className="underline underline-offset-4">
          {FEEDBACK_EMAIL}
        </a>
        . We will remove your account on request.
      </p>
      <p className="mt-3 text-muted-foreground">
        Questions about this policy? Email{" "}
        <a href={`mailto:${FEEDBACK_EMAIL}`} className="underline underline-offset-4">
          {FEEDBACK_EMAIL}
        </a>
        .
      </p>
    </article>
  ),
});
