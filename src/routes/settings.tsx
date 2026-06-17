import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { VoiceSelector } from "../components/VoiceSelector";
import { HapticButton } from "../components/HapticButton";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, setVoiceStyle } from "@/lib/api/profile.functions";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "../lib/push-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings • Full Time" },
      { name: "description", content: "Pick your commentary voice. Toggle notifications." },
      { property: "og:title", content: "Settings • Full Time" },
      { property: "og:url", content: "/settings" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyProfile);
  const saveVoice = useServerFn(setVoiceStyle);
  const [voice, setVoice] = useState<"classic" | "wit" | "concise">("classic");
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then((p) => {
        if (p?.voice_style_pref)
          setVoice(p.voice_style_pref as "classic" | "wit" | "concise");
      })
      .catch(() => {});
  }, [user, fetchProfile]);

  useEffect(() => {
    isPushSubscribed().then(setNotif);
  }, [user]);

  const handleVoice = (v: "classic" | "wit" | "concise") => {
    setVoice(v);
    if (user) saveVoice({ data: { voiceStyle: v } }).catch(() => {});
  };

  const handleNotif = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (notif) {
        await unsubscribeFromPush();
        setNotif(false);
      } else {
        const ok = await subscribeToPush();
        setNotif(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Settings</div>
      <h1 className="mb-6 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Make it yours.
      </h1>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Account</h2>
        {user ? (
          <div className="surface flex items-center justify-between rounded-[var(--radius-lg)] p-4">
            <div>
              <div className="text-sm font-semibold tracking-tight">{user.email}</div>
              <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Synced across devices
              </div>
            </div>
            <HapticButton
              hapticPattern="soft"
              onClick={() => supabase.auth.signOut()}
              className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Sign out
            </HapticButton>
          </div>
        ) : (
          <Link
            to="/auth"
            className="surface block rounded-[var(--radius-lg)] p-4 text-sm"
          >
            <div className="font-semibold tracking-tight">Sync across devices</div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Magic link · no password · optional
            </div>
          </Link>
        )}
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Commentary voice</h2>
        <VoiceSelector active={voice} onChange={handleVoice} />
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Notifications</h2>
        <div className="surface flex items-center justify-between rounded-[var(--radius-lg)] p-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">Morning recap</div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {user ? "A single nudge · 7am daily" : "Sign in to enable web push"}
            </div>
          </div>
          <HapticButton
            hapticPattern="soft"
            onClick={handleNotif}
            disabled={!user || busy}
            aria-pressed={notif}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              notif ? "bg-[var(--lime)]" : "bg-white/12",
              (!user || busy) && "opacity-40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                notif ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </HapticButton>
        </div>
      </section>

      <section className="surface rounded-[var(--radius-lg)] p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="eyebrow mb-2">AI disclosure</div>
        Recaps on Full Time are generated by AI from publicly available match data. Voices are
        synthetic. No copyrighted broadcast audio is used.
        <div className="mt-4 flex gap-4 text-mono text-[10px] uppercase tracking-[0.18em]">
          <Link to="/legal/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
          <Link to="/legal/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}
