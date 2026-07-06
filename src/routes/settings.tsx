import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { PersonalitySelector, PERSONALITIES, type PersonalityId } from "../components/PersonalitySelector";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/use-auth";
import { useEntitlement } from "../hooks/use-entitlement";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, setVoiceStyle } from "@/lib/api/profile.functions";
import { createPortal } from "@/lib/api/billing.functions";
import { PRO_VOICE_STYLES, PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD } from "@/lib/entitlement";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "../lib/push-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings • Full Time" },
      { name: "description", content: "Your morning football briefing. Toggle the 7am nudge." },
      { property: "og:title", content: "Settings • Full Time" },
      { property: "og:url", content: "/settings" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPro } = useEntitlement();
  const fetchProfile = useServerFn(getMyProfile);
  const saveVoice = useServerFn(setVoiceStyle);
  const openPortal = useServerFn(createPortal);
  const [personality, setPersonality] = useState<PersonalityId>("zen");
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  const handleManage = async () => {
    setBillingBusy(true);
    try {
      const { url } = await openPortal();
      window.location.href = url;
    } catch {
      setBillingBusy(false);
    }
  };

  useEffect(() => {
    isPushSubscribed().then(setNotif);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then((p) => {
        const v = p?.voice_style_pref;
        if (v && PERSONALITIES.some((x) => x.id === v)) setPersonality(v as PersonalityId);
      })
      .catch(() => {});
  }, [user, fetchProfile]);

  const handlePersonality = (v: PersonalityId) => {
    setPersonality(v);
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
        <h2 className="eyebrow mb-3">Membership</h2>
        {isPro ? (
          <div className="surface flex items-center justify-between rounded-[var(--radius-lg)] p-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <Crown className="h-3.5 w-3.5 text-[var(--lime)]" /> Full Time Pro
              </div>
              <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Active · thank you
              </div>
            </div>
            <HapticButton
              hapticPattern="soft"
              onClick={handleManage}
              disabled={billingBusy}
              className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {billingBusy ? "…" : "Manage"}
            </HapticButton>
          </div>
        ) : (
          <Link
            to="/pro"
            className="surface flex items-center justify-between rounded-[var(--radius-lg)] p-4"
          >
            <div>
              <div className="text-sm font-semibold tracking-tight">Upgrade to Full Time Pro</div>
              <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Every pundit · every league · {PRO_PRICE_DISPLAY}
                {PRO_PRICE_PERIOD}
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--lime)]">Go →</span>
          </Link>
        )}
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Your pundit</h2>
        <PersonalitySelector
          active={personality}
          onChange={handlePersonality}
          lockedIds={isPro ? [] : PRO_VOICE_STYLES}
          onLockedClick={() => navigate({ to: "/pro" })}
        />
        <p className="text-mono mt-3 text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground/70">
          {isPro
            ? "Your pick is saved. Distinct pundit narration is rolling out."
            : "The Reporter is free. The other five are Full Time Pro."}
        </p>
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
        <div className="eyebrow mb-2">How Full Time works</div>
        Every recap is written from public match data and read by a single, consistent
        synthetic broadcast voice. Generated by AI. No copyrighted broadcast audio is used.
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
