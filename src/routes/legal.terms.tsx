import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/legal/terms")({
  head: () =>
    pageSeo({
      path: "/legal/terms",
      title: "Terms • Full Time",
      description: "Terms of use for Full Time.",
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
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Terms</h1>
      <p className="mt-4 text-muted-foreground">
        Full Time is a pre-launch service that makes AI Pundit football shows from checked
        structured match data. Scripts are AI-generated and voices are synthetic. We do not use
        copyrighted broadcast audio or imitate a living pundit.
      </p>
      <p className="mt-3 text-muted-foreground">
        Shows are commentary, not real-time information or betting advice. We use evidence and
        review controls, but we do not promise that every claim will be correct. Do not rely on a
        show for betting, news reporting, or another commercial decision.
      </p>
      <p className="mt-3 text-muted-foreground">
        Service is provided as-is. We may change or stop it at any time.
      </p>
    </article>
  ),
});
