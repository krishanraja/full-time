import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getWaitlistStatus, joinWaitlist, type WaitlistStatus } from "@/lib/api/waitlist.functions";
import { track } from "../lib/analytics";

type Search = { join?: boolean };

export const Route = createFileRoute("/waitlist")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    join: s.join === 1 || s.join === "1" || s.join === true ? true : undefined,
  }),
  head: () =>
    pageSeo({
      path: "/waitlist",
      title: "Waitlist • Full Time",
      description:
        "Ask for one email when Full Time passes its editorial, narration and operational launch gates.",
    }),
  component: WaitlistPage,
});

function trackJoin(source: string) {
  track("waitlist_join", { source });
}

// What's live today vs what the waitlist reserves. Keep this honest: the
// left column must only list things that work right now.
const TODAY = [
  "All six pundit choices are free",
  "Only approved current drops appear",
  "No fake playback or silent fallback",
];
const FULL_APP = [
  "Full-length six-variant mornings",
  "A plain check on settled AI Pundit calls",
  "Launch timing follows evidence, not a calendar",
];

function WaitlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { join } = Route.useSearch();
  const queryClient = useQueryClient();

  const fetchStatus = useServerFn(getWaitlistStatus);
  const doJoin = useServerFn(joinWaitlist);

  const status = useQuery<WaitlistStatus>({
    queryKey: ["waitlist", user?.id ?? "anon"],
    queryFn: () => fetchStatus(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleJoin = async (source: "waitlist_page" | "auth_redirect") => {
    setErr(null);
    setBusy(true);
    try {
      const s = await doJoin({ data: { source } });
      queryClient.setQueryData(["waitlist", user?.id ?? "anon"], s);
      trackJoin(source);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not join. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Arriving from the magic link with ?join=1: finish the join automatically.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (!join || !user || autoJoined.current) return;
    if (status.isLoading || status.data?.joined) return;
    autoJoined.current = true;
    void handleJoin("auth_redirect");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [join, user, status.isLoading, status.data?.joined]);

  // Anonymous join: the magic link IS the account. It lands back here
  // with ?join=1 so the join completes without another tap.
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/waitlist?join=1" },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  const joined = !!status.data?.joined;

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Private verification</div>

      {joined ? (
        <>
          <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
            You&rsquo;re on the list.
          </h1>
          <div className="surface mt-6 rounded-[var(--radius-lg)] p-5">
            <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Your place in line
            </div>
            <div className="text-mono mt-1 text-[40px] font-semibold leading-none tracking-tight text-[var(--lime)]">
              {status.data?.position != null ? `#${status.data.position}` : "…"}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You will get one email after every editorial, narration, prediction and operational
              launch gate passes. We will not manufacture a date to fill this space.
            </p>
          </div>
          <WhatYouGet />
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Back to today&rsquo;s drop
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
            Get the launch note.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Full Time is still proving six distinct, useful and funny AI Pundits over full-length
            shows. Leave your email for one message when the evidence says it is ready.
          </p>

          <WhatYouGet />

          {err && <p className="mt-5 text-xs text-[color:#ff6b6b]">{err}</p>}

          {user ? (
            <HapticButton
              hapticPattern="success"
              onClick={() => handleJoin("waitlist_page")}
              disabled={busy || authLoading || status.isLoading}
              className="glow-lime mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lime)] px-5 py-3.5 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Join the waitlist
            </HapticButton>
          ) : sent ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_8%,transparent)] p-5 text-sm">
              Check your inbox. The link signs you in and saves your place, one tap.
            </div>
          ) : (
            <form onSubmit={submitEmail} className="mt-6 flex flex-col gap-3">
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="surface rounded-[var(--radius-lg)] px-4 py-3 text-sm outline-none focus:border-[var(--lime)]"
              />
              <HapticButton
                disabled={busy}
                className="glow-lime rounded-full bg-[var(--lime)] px-5 py-3.5 text-sm font-semibold tracking-tight text-[var(--primary-foreground)] disabled:opacity-50"
              >
                {busy ? "Sending…" : "Join the waitlist"}
              </HapticButton>
              <p className="text-mono text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                The link is your account · no password · free
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Maybe later
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function WhatYouGet() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="surface rounded-[var(--radius-lg)] p-4">
        <div className="eyebrow mb-3">Preview standard</div>
        <ul className="flex flex-col gap-2.5">
          {TODAY.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lime)]" strokeWidth={2.5} />
              <span className="text-xs leading-snug">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="surface rounded-[var(--radius-lg)] p-4">
        <div className="eyebrow mb-3">Launch gate</div>
        <ul className="flex flex-col gap-2.5">
          {FULL_APP.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-mono mt-0.5 h-3.5 w-3.5 shrink-0 text-center text-[10px] leading-[14px] text-muted-foreground">
                ·
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
