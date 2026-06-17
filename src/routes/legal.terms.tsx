import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms • Full Time" },
      { name: "description", content: "Terms of use for Full Time." },
      { property: "og:title", content: "Terms • Full Time" },
      { property: "og:url", content: "/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: () => (
    <article className="prose prose-invert py-6 text-sm leading-relaxed">
      <Link to="/settings" className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">← Back</Link>
      <div className="eyebrow mt-4">Legal</div>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Terms</h1>
      <p className="mt-4 text-muted-foreground">
        Full Time is a free service that publishes AI-generated audio recaps of football matches.
        Recaps are produced from publicly available match data. Voices are synthetic. We do not use
        copyrighted broadcast audio.
      </p>
      <p className="mt-3 text-muted-foreground">
        Recaps are commentary, not real-time information. We make no guarantee of accuracy. Do not
        rely on recaps for betting, news reporting, or other commercial decisions.
      </p>
      <p className="mt-3 text-muted-foreground">
        Service is provided as-is. We may change or stop it at any time.
      </p>
    </article>
  ),
});
