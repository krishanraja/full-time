import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy • Full Time" },
      { name: "description", content: "How Full Time handles your data." },
      { property: "og:title", content: "Privacy • Full Time" },
      { property: "og:url", content: "/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: () => (
    <article className="prose prose-invert mx-auto max-w-md px-4 py-6 text-sm leading-relaxed">
      <Link to="/settings" className="text-xs text-muted-foreground">← Back</Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Privacy</h1>
      <p className="mt-4 text-muted-foreground">
        Full Time stores only what we need to deliver your morning recap. If you sign in, we keep
        your email, the teams you follow, and your voice preference. If you opt in to push
        notifications, we store the device endpoint we need to send them.
      </p>
      <p className="mt-3 text-muted-foreground">
        We do not sell your data. We do not run third-party advertising trackers. Anonymous,
        cookieless analytics (Plausible) tell us which recaps people listened to.
      </p>
      <p className="mt-3 text-muted-foreground">
        Want your data deleted? Sign out and email support — we will remove your account on request.
      </p>
    </article>
  ),
});
