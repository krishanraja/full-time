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
    <div className="px-4 pb-6 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        Settings
      </div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Make it yours</h1>

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        {user ? (
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-card p-4">
            <div>
              <div className="text-sm font-semibold">{user.email}</div>
              <div className="text-xs text-muted-foreground">Synced across devices</div>
            </div>
            <HapticButton
              hapticPattern="soft"
              onClick={() => supabase.auth.signOut()}
              className="text-xs font-semibold text-muted-foreground"
            >
              Sign out
            </HapticButton>
          </div>
        ) : (
          <Link
            to="/auth"
            className="block rounded-2xl border border-white/8 bg-card p-4 text-sm"
          >
            <div className="font-semibold">Sync across devices</div>
            <div className="text-xs text-muted-foreground">
              Magic link sign-in. No password. Optional.
            </div>
          </Link>
        )}
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Commentary voice
        </h2>
        <VoiceSelector active={voice} onChange={handleVoice} />
      </section>

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Notifications
        </h2>
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-card p-4">
          <div>
            <div className="text-sm font-semibold">Morning recap</div>
            <div className="text-xs text-muted-foreground">
              {user ? "A single nudge. 7am, daily." : "Sign in to enable web push."}
            </div>
          </div>
          <HapticButton
            hapticPattern="soft"
            onClick={handleNotif}
            disabled={!user || busy}
            aria-pressed={notif}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              notif ? "bg-primary" : "bg-white/15",
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

      <section className="rounded-2xl border border-white/8 bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="mb-1 text-sm font-semibold text-foreground">AI disclosure</div>
        Recaps on Full Time are generated by AI from publicly available match data. Voices are
        synthetic. No copyrighted broadcast audio is used.
        <div className="mt-3 flex gap-4 text-xs">
          <Link to="/legal/privacy" className="underline">
            Privacy
          </Link>
          <Link to="/legal/terms" className="underline">
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}
