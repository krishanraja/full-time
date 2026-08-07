import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Crown } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { useAuth } from "../hooks/use-auth";
import { useEntitlement } from "../hooks/use-entitlement";
import { createCheckout, createPortal, syncCheckout } from "@/lib/api/billing.functions";
import {
  PRO_PRICE_DISPLAY,
  PRO_PRICE_PERIOD,
  FREE_DAILY_GENERATION_LIMIT,
  PRO_DAILY_GENERATION_LIMIT,
} from "@/lib/entitlement";
import { pageSeo } from "@/lib/seo";

type Search = { status?: "success" | "cancel"; session_id?: string };

export const Route = createFileRoute("/pro")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: s.status === "success" || s.status === "cancel" ? s.status : undefined,
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () =>
    pageSeo({
      path: "/pro",
      title: "Full Time Pro",
      description:
        "All six pundits, and " +
        PRO_DAILY_GENERATION_LIMIT +
        " narrations a day instead of " +
        FREE_DAILY_GENERATION_LIMIT +
        ". " +
        PRO_PRICE_DISPLAY +
        PRO_PRICE_PERIOD +
        ", cancel any time.",
    }),
  component: Pro,
});

// ONLY things enforced in code today. This page takes real money on live
// Stripe keys, so an aspirational bullet here is a false claim, not marketing.
// Both of these are gated server-side: setVoiceStyle rejects a Pro pundit for
// a non-Pro caller, and requestEpisode resolves the daily limit per profile.
// Anything not yet built belongs in NEXT_UP below, visibly separated.
const FEATURES = [
  "All six pundits, not two",
  `${PRO_DAILY_GENERATION_LIMIT} narrations a day, not ${FREE_DAILY_GENERATION_LIMIT}`,
  "Cancel any time, from the app",
];

// Explicitly NOT included in what you are paying for today. Kept on the page
// because it is the honest roadmap, kept out of FEATURES because it does not
// exist yet.
const NEXT_UP = ["Ask your pundit a question about any match"];

function Pro() {
  const { user } = useAuth();
  const { isPro, entitlement, refetch, loading } = useEntitlement();
  const { status, session_id } = Route.useSearch();
  const navigate = useNavigate();

  const startCheckout = useServerFn(createCheckout);
  const openPortal = useServerFn(createPortal);
  const sync = useServerFn(syncCheckout);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(status === "success");

  // On return from a successful checkout, reconcile entitlement from Stripe.
  useEffect(() => {
    if (status !== "success" || !session_id || !user) {
      setSyncing(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        await sync({ data: { sessionId: session_id } });
        await refetch();
      } catch {
        /* webhook will still catch up */
      } finally {
        if (alive) {
          setSyncing(false);
          navigate({ to: "/pro", replace: true });
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session_id, user]);

  const upgrade = async () => {
    setErr(null);
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const { url } = await startCheckout();
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  const manage = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { url } = await openPortal();
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open billing.");
      setBusy(false);
    }
  };

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow flex items-center gap-1.5">
        <Crown className="h-3 w-3 text-[var(--lime)]" /> Full Time Pro
      </div>

      {syncing ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--lime)]" />
          <p className="text-sm">Confirming your subscription…</p>
        </div>
      ) : isPro ? (
        <>
          <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
            You’re Pro. Nice.
          </h1>
          <p className="text-sm text-muted-foreground">
            All six pundits, and {PRO_DAILY_GENERATION_LIMIT} narrations a day. Thanks for
            backing the project.
          </p>
          <div className="surface mt-6 rounded-[var(--radius-lg)] p-4">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Plan
            </div>
            <div className="mt-1 text-sm font-semibold tracking-tight">
              Full Time Pro · {PRO_PRICE_DISPLAY}
              {PRO_PRICE_PERIOD}
            </div>
            {entitlement.currentPeriodEnd && (
              <div className="text-mono mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Renews {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
          </div>
          <HapticButton
            hapticPattern="soft"
            onClick={manage}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--pitch-line)] px-5 py-3 text-sm font-semibold hover:border-foreground/30 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Manage billing
          </HapticButton>
        </>
      ) : (
        <>
          <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
            Pick your voice. Name more games.
          </h1>
          <p className="text-sm text-muted-foreground">
            The daily drop stays free, and so does the archive. Pro is the two things that
            cost us money to run.
          </p>

          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-[40px] font-semibold leading-none tracking-tight">
              {PRO_PRICE_DISPLAY}
            </span>
            <span className="text-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {PRO_PRICE_PERIOD} · cancel anytime
            </span>
          </div>

          <ul className="mt-6 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--lime)]">
                  <Check className="h-3 w-3 text-[var(--primary-foreground)]" strokeWidth={3} />
                </span>
                <span className="text-sm leading-snug">{f}</span>
              </li>
            ))}
          </ul>

          {/* Deliberately outside the ticked list and visually demoted: this
              is not part of what the subscription buys today. */}
          <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--pitch-line)] p-4">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Next, not included yet
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {NEXT_UP.map((f) => (
                <li key={f} className="text-sm leading-snug text-muted-foreground">
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-snug text-muted-foreground/70">
              Not built yet, so you are not paying for it. Subscribing now gets you the two
              things above and this when it lands.
            </p>
          </div>

          {status === "cancel" && (
            <p className="mt-5 text-xs text-muted-foreground">
              No worries, nothing was charged. The daily drop is still free.
            </p>
          )}
          {err && <p className="mt-5 text-xs text-[color:#ff6b6b]">{err}</p>}

          <HapticButton
            hapticPattern="success"
            onClick={upgrade}
            disabled={busy || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lime)] px-5 py-3.5 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {user ? "Upgrade to Pro" : "Sign in to upgrade"}
          </HapticButton>

          <p className="text-mono mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Secure checkout by Stripe
          </p>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Maybe later
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
