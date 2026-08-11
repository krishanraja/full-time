import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import {
  PersonalitySelector,
  PERSONALITIES,
  type PersonalityId,
} from "@/components/PersonalitySelector";
import { HapticButton } from "@/components/HapticButton";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlement } from "@/hooks/use-entitlement";
import { supabase } from "@/integrations/supabase/client";
import { createPortal } from "@/lib/api/billing.functions";
import { getMyProfile } from "@/lib/api/profile.functions";
import {
  PRO_PRICE_DISPLAY,
  PRO_PRICE_PERIOD,
  VOICE_STYLE_STORAGE_KEY,
  effectiveVoiceStyle,
} from "@/lib/entitlement";
import { PRELAUNCH_MODE } from "@/lib/launch-config";
import { pageSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";

export const Route = createFileRoute("/settings")({
  head: () =>
    pageSeo({
      path: "/settings",
      title: "Settings - Full Time",
      description: "Choose your Full Time pundit and manage optional account preferences.",
      noindex: true,
    }),
  component: Settings,
});

function Settings() {
  const { user, session } = useAuth();
  const { isPro } = useEntitlement();
  const fetchProfile = useServerFn(getMyProfile);
  const openPortal = useServerFn(createPortal);
  const [personality, setPersonality] = useState<PersonalityId>("zen");
  const [notifications, setNotifications] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    if (PRELAUNCH_MODE) return;
    void isPushSubscribed().then(setNotifications);
  }, []);

  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem(VOICE_STYLE_STORAGE_KEY);
      if (stored && PERSONALITIES.some((item) => item.id === stored)) {
        setPersonality(stored as PersonalityId);
      }
      return;
    }
    void fetchProfile()
      .then((profile) => {
        const selected = effectiveVoiceStyle(profile?.voice_style_pref, isPro);
        if (PERSONALITIES.some((item) => item.id === selected)) setPersonality(selected);
      })
      .catch(() => undefined);
  }, [fetchProfile, isPro, user]);

  const choosePersonality = (selected: PersonalityId) => {
    setPersonality(selected);
    localStorage.setItem(VOICE_STYLE_STORAGE_KEY, selected);
    void fetch("/api/profile/pundit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ pundit: selected }),
    });
  };

  const toggleNotifications = async () => {
    if (!user || PRELAUNCH_MODE) return;
    setNotificationBusy(true);
    try {
      if (notifications) {
        await unsubscribeFromPush();
        setNotifications(false);
      } else {
        setNotifications(await subscribeToPush());
      }
    } finally {
      setNotificationBusy(false);
    }
  };

  const manageBilling = async () => {
    setBillingBusy(true);
    try {
      const { url } = await openPortal();
      window.location.href = url;
    } finally {
      setBillingBusy(false);
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
              <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Preference synced across devices
              </div>
            </div>
            <HapticButton
              hapticPattern="soft"
              onClick={() => void supabase.auth.signOut()}
              className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Sign out
            </HapticButton>
          </div>
        ) : (
          <Link to="/auth" className="surface block rounded-[var(--radius-lg)] p-4 text-sm">
            <div className="font-semibold tracking-tight">Sync across devices</div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Magic link / no password / optional
            </div>
          </Link>
        )}
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Product status</h2>
        <Link
          to="/waitlist"
          className="surface flex items-center justify-between gap-4 rounded-[var(--radius-lg)] p-4"
        >
          <div>
            <div className="text-sm font-semibold tracking-tight">Private verification</div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              No launch date until every quality gate passes
            </div>
          </div>
          <span className="text-right text-xs font-semibold text-[var(--lime)]">
            Get the launch note
          </span>
        </Link>
        {isPro && (
          <div className="surface mt-3 flex items-center justify-between rounded-[var(--radius-lg)] p-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <Crown className="h-3.5 w-3.5 text-[var(--lime)]" /> Existing Pro account
              </div>
              <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Billing management remains available
              </div>
            </div>
            <HapticButton
              hapticPattern="soft"
              onClick={() => void manageBilling()}
              disabled={billingBusy}
              className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground disabled:opacity-40"
            >
              {billingBusy ? "Opening..." : "Manage"}
            </HapticButton>
          </div>
        )}
        {!PRELAUNCH_MODE && user && !isPro && (
          <Link to="/pro" className="surface mt-3 block rounded-[var(--radius-lg)] p-4 text-sm">
            Full Time Pro / {PRO_PRICE_DISPLAY}
            {PRO_PRICE_PERIOD}
          </Link>
        )}
        {PRELAUNCH_MODE && (
          <div className="surface mt-3 rounded-[var(--radius-lg)] p-4 text-sm text-muted-foreground">
            All six pundits are free. New subscriptions are paused.
          </div>
        )}
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Your pundit</h2>
        <PersonalitySelector active={personality} onChange={choosePersonality} lockedIds={[]} />
        <p className="text-mono mt-3 text-[10px] uppercase leading-relaxed tracking-[0.18em] text-muted-foreground/70">
          Your pick changes the analysis, humour, script and performance - not only the voice.
        </p>
      </section>

      <section className="mb-7">
        <h2 className="eyebrow mb-3">Notifications</h2>
        <div className="surface flex items-center justify-between rounded-[var(--radius-lg)] p-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">Morning recap</div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {PRELAUNCH_MODE
                ? "Paused during private verification"
                : user
                  ? "One nudge after an approved drop"
                  : "Sign in to enable web push"}
            </div>
          </div>
          <HapticButton
            hapticPattern="soft"
            onClick={() => void toggleNotifications()}
            disabled={PRELAUNCH_MODE || !user || notificationBusy}
            aria-pressed={notifications}
            aria-label="Morning recap notification"
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              notifications ? "bg-[var(--lime)]" : "bg-white/12",
              (PRELAUNCH_MODE || !user || notificationBusy) && "opacity-40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                notifications ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </HapticButton>
        </div>
      </section>

      <section className="surface rounded-[var(--radius-lg)] p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="eyebrow mb-2">How Full Time works</div>
        Every edition is written from licensed structured match data and performed with a versioned
        synthetic voice profile. Generated by AI. No copyrighted broadcast audio is used.
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
