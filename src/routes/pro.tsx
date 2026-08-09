import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Loader2 } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { useEntitlement } from "../hooks/use-entitlement";
import { createPortal } from "@/lib/api/billing.functions";
import { PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD } from "@/lib/entitlement";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/pro")({
  head: () =>
    pageSeo({
      path: "/pro",
      title: "Full Time Pre-launch",
      description:
        "Full Time is in pre-launch. All six AI pundits are free while editorial and narration quality are verified.",
    }),
  component: Pro,
});

function Pro() {
  const { isPro, entitlement } = useEntitlement();
  const openPortal = useServerFn(createPortal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manage = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await openPortal();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setBusy(false);
    }
  };

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow flex items-center gap-1.5">
        <Crown className="h-3 w-3 text-[var(--lime)]" /> Pre-launch
      </div>
      <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Quality first. Checkout later.
      </h1>
      <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
        New subscriptions are paused while we prove that every pundit is distinct, insightful, funny
        and reliable over full-length shows. All six are free to try.
      </p>

      <div className="surface mt-6 rounded-[var(--radius-lg)] p-5">
        <div className="eyebrow">The launch standard</div>
        <p className="mt-2 text-sm leading-relaxed">
          One football morning. Six genuinely different minds. Every opinion has evidence. Every
          prediction gets a receipt.
        </p>
      </div>

      {isPro && (
        <div className="surface mt-4 rounded-[var(--radius-lg)] p-4">
          <div className="text-sm font-semibold">Your existing Pro subscription</div>
          <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {PRO_PRICE_DISPLAY}
            {PRO_PRICE_PERIOD}
            {entitlement.currentPeriodEnd
              ? ` · renews ${new Date(entitlement.currentPeriodEnd).toLocaleDateString()}`
              : ""}
          </div>
          <HapticButton
            hapticPattern="soft"
            onClick={manage}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--pitch-line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Manage billing
          </HapticButton>
          {error && (
            <p role="alert" className="mt-3 text-xs text-[color:#ff8a8a]">
              {error}
            </p>
          )}
        </div>
      )}

      <Link
        to="/settings"
        className="mt-6 block w-full rounded-full bg-[var(--lime)] px-5 py-3.5 text-center text-sm font-semibold text-[var(--primary-foreground)]"
      >
        Choose your pundit
      </Link>
    </div>
  );
}
