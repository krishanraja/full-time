import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HapticButton } from "../components/HapticButton";

// Where the magic link may land the user afterwards. An allowlist keeps the
// param from becoming an open redirect.
const REDIRECTS = ["/settings", "/archive", "/waitlist", "/"] as const;
type Redirect = (typeof REDIRECTS)[number];

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: Redirect } => ({
    redirect: REDIRECTS.includes(s.redirect as Redirect) ? (s.redirect as Redirect) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in • Full Time" },
      { name: "description", content: "Magic-link sign in. No password." },
    ],
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
        className="text-mono mb-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Sync across devices.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Optional and free. Unlocks all six pundits and saves your follows, voice, and
        notification preference across devices.
      </p>

      {sent ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_8%,transparent)] p-5 text-sm">
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
            className="surface rounded-[var(--radius-lg)] px-4 py-3 text-sm outline-none focus:border-[var(--lime)]"
          />
          <HapticButton
            disabled={busy}
            className="glow-lime rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-semibold tracking-tight text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a magic link"}
          </HapticButton>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </form>
      )}
    </div>
  );
}
