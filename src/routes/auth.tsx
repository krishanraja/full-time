import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HapticButton } from "../components/HapticButton";

// Where the magic link may land the user afterwards. An allowlist keeps the
// param from becoming an open redirect.
const REDIRECTS = ["/settings", "/archive", "/waitlist", "/pro", "/"] as const;
type Redirect = (typeof REDIRECTS)[number];

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: Redirect } => ({
    redirect: REDIRECTS.includes(s.redirect as Redirect) ? (s.redirect as Redirect) : undefined,
  }),
  head: () =>
    pageSeo({
      path: "/auth",
      title: "Sign in • Full Time",
      description: "Magic-link sign in. No password.",
      noindex: true,
    }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + (redirect ?? "/settings"),
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="pb-6 pt-4">
      <button
        onClick={() => navigate({ to: "/settings" })}
        className="-ml-1 mb-3 min-h-11 px-1 text-[14px] text-ink-2 hover:text-foreground"
      >
        ← Back
      </button>
      <div className="eyebrow">Account</div>
      <h1 className="serif mt-2 text-[clamp(34px,10vw,46px)] leading-[1.02]">
        Sync across devices.
      </h1>
      <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">
        Optional and free. Unlocks all six pundits and saves your follows, voice, and notification
        preference across devices.
      </p>

      {sent ? (
        <div className="mt-8 rounded-[3px] border border-[var(--pitch-line)] bg-card p-5 text-[15px]">
          Check your inbox for the sign-in link. You can close this tab.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 rounded-[3px] border border-[var(--pitch-line)] bg-card px-4 text-[15px] outline-none placeholder:text-ink-3 focus:border-foreground"
          />
          <HapticButton
            disabled={busy}
            className="min-h-12 rounded-[3px] bg-foreground px-5 text-[15px] font-semibold text-[var(--ground-2)] disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a magic link"}
          </HapticButton>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </form>
      )}
    </div>
  );
}
