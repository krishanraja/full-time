import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HapticButton } from "../components/HapticButton";

export const Route = createFileRoute("/auth")({
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
        emailRedirectTo: window.location.origin + "/settings",
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="px-4 pb-6 pt-5">
      <button
        onClick={() => navigate({ to: "/settings" })}
        className="mb-4 text-xs text-muted-foreground"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-extrabold tracking-tight">Sync across devices</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Optional. Saves your follows, voice, and notification preference.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/10 p-5 text-sm">
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
            className="rounded-2xl border border-white/8 bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <HapticButton
            disabled={busy}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a magic link"}
          </HapticButton>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </form>
      )}
    </div>
  );
}
