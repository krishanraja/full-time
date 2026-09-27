import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, X } from "lucide-react";
import { PERSONALITIES, type PersonalityId } from "@/components/PersonalitySelector";
import { HapticButton } from "@/components/HapticButton";
import { PunditAvatar } from "@/components/PunditAvatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlement } from "@/hooks/use-entitlement";
import { supabase } from "@/integrations/supabase/client";
import { createPortal } from "@/lib/api/billing.functions";
import { getMyProfile } from "@/lib/api/profile.functions";
import { VOICE_STYLE_STORAGE_KEY, effectiveVoiceStyle } from "@/lib/entitlement";
import { PRELAUNCH_MODE } from "@/lib/launch-config";
import { pageSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";

export const Route = createFileRoute("/settings")({
  head: () =>
    pageSeo({
      path: "/settings",
      title: "Settings - Full Time",
      description: "Choose your Full Time AI Pundit and manage optional account preferences.",
      noindex: true,
    }),
  component: Settings,
});

/** A stable seed so the Settings avatars do not change between visits. */
const SETTINGS_SEED = "settings";

const row =
  "flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left";
const rowLabel = "text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

function PunditRow({
  active,
  onChoose,
}: {
  active: PersonalityId;
  onChoose: (id: PersonalityId) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = PERSONALITIES.find((item) => item.id === active)!;
  return (
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <HapticButton hapticPattern="soft" className={row} aria-label={`Change AI Pundit. ${selected.name} is selected.`}>
          <span className="flex min-w-0 items-center gap-3">
            <PunditAvatar punditId={active} editionSeed={SETTINGS_SEED} className="h-10 w-10 shrink-0 rounded-[12px]" />
            <span className="min-w-0">
              <span className={cn(rowLabel, "block")}>Your AI Pundit</span>
              <span className="mt-0.5 block text-sm font-semibold tracking-tight">{selected.name}</span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </HapticButton>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-[560px] rounded-t-[28px] border-[var(--pitch-line)] bg-card px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="grid grid-cols-[1fr_44px] items-start gap-3 px-0 pb-3 pt-4 text-left">
          <div>
            <DrawerTitle className="text-[22px] leading-tight">Pick your AI Pundit</DrawerTitle>
            <DrawerDescription className="mt-1 text-[13px]">
              Your pick changes the whole show, not only the voice.
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
            aria-label="Close AI Pundit picker"
          >
            <X className="h-4 w-4" />
          </button>
        </DrawerHeader>
        <div className="grid gap-1.5" role="radiogroup" aria-label="AI Pundits">
          {PERSONALITIES.map((item) => {
            const checked = item.id === active;
            return (
              <HapticButton
                key={item.id}
                hapticPattern="soft"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  setOpen(false);
                  if (!checked) onChoose(item.id);
                }}
                className={cn(
                  "grid min-h-[58px] w-full grid-cols-[40px_minmax(0,1fr)_22px] items-center gap-x-3 rounded-[14px] border px-3 py-1.5 text-left",
                  checked
                    ? "border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_10%,transparent)]"
                    : "border-[var(--pitch-line)] bg-[#0d1315]",
                )}
              >
                <PunditAvatar punditId={item.id} editionSeed={SETTINGS_SEED} className="h-10 w-10 rounded-[12px]" />
                <span className="min-w-0">
                  <strong className="block text-sm">{item.name}</strong>
                  <small className="mt-0.5 block truncate text-xs text-muted-foreground">{item.tag}</small>
                </span>
                <span
                  className={cn(
                    "grid h-[21px] w-[21px] place-items-center rounded-full border",
                    checked
                      ? "border-[var(--lime)] bg-[var(--lime)] text-[#071008]"
                      : "border-white/30 text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </HapticButton>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Settings, on one screen: your AI Pundit, your account, the morning recap,
 * billing for existing subscribers, and how Full Time works.
 *
 * Cut on 2026-09-27 for the one-screen rule: a "Private verification / No
 * launch date" card and a waitlist link, both untrue since the live beta
 * began on 2026-09-04; a Pro upsell priced at checkout while checkout is
 * off; and six tall pundit cards, now one row that opens the picker.
 */
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

  const recapDisabled = PRELAUNCH_MODE || !user || notificationBusy;

  return (
    <div className="flex min-h-0 flex-1 flex-col py-[clamp(10px,2dvh,20px)]">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Settings</h1>

      <div className="surface mt-[clamp(10px,2.4dvh,20px)] divide-y divide-[var(--pitch-line)] overflow-hidden rounded-[var(--radius-lg)]">
        <PunditRow active={personality} onChoose={choosePersonality} />

        {user ? (
          <div className={row}>
            <span className="min-w-0">
              <span className={cn(rowLabel, "block")}>Signed in</span>
              <span className="mt-0.5 block truncate text-sm font-semibold tracking-tight">
                {user.email}
              </span>
            </span>
            <HapticButton
              hapticPattern="soft"
              onClick={() => void supabase.auth.signOut()}
              className="min-h-11 shrink-0 px-1 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Sign out
            </HapticButton>
          </div>
        ) : (
          <Link to="/auth" className={row}>
            <span>
              <span className={cn(rowLabel, "block")}>Account</span>
              <span className="mt-0.5 block text-sm font-semibold tracking-tight">
                Sync across devices
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        )}

        <div className={row}>
          <span>
            <span className={cn(rowLabel, "block")}>
              {user ? "One nudge when a show is ready" : "Sign in to turn on"}
            </span>
            <span className="mt-0.5 block text-sm font-semibold tracking-tight">Morning recap</span>
          </span>
          <HapticButton
            hapticPattern="soft"
            onClick={() => void toggleNotifications()}
            disabled={recapDisabled}
            aria-pressed={notifications}
            aria-label="Morning recap notification"
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              notifications ? "bg-[var(--lime)]" : "bg-white/12",
              recapDisabled && "opacity-40",
            )}
          >
            <span
              className={cn(
                // Anchored left: without it the button centres the knob and
                // an off switch draws as on.
                "absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                notifications ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </HapticButton>
        </div>

        {isPro && (
          <div className={row}>
            <span>
              <span className={cn(rowLabel, "block")}>Existing Pro account</span>
              <span className="mt-0.5 block text-sm font-semibold tracking-tight">Billing</span>
            </span>
            <HapticButton
              hapticPattern="soft"
              onClick={() => void manageBilling()}
              disabled={billingBusy}
              className="min-h-11 shrink-0 px-1 text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground disabled:opacity-40"
            >
              {billingBusy ? "Opening..." : "Manage"}
            </HapticButton>
          </div>
        )}
      </div>

      {/* The disclosure docs/05-content-safety.md and docs/11-legal.md require
          in Settings: AI-written scripts from checked match data, synthetic
          voices, no copyrighted broadcast audio. Shorter, not softer. */}
      <section className="mt-[clamp(12px,3dvh,24px)] text-xs leading-relaxed text-muted-foreground">
        <h2 className="eyebrow mb-1.5">How Full Time works</h2>
        <p>
          AI Pundits write every show from checked, licensed match data. The voices are synthetic.
          We use no copyrighted broadcast audio.
        </p>
        <div className="mt-1 flex gap-5 text-mono text-[10px] uppercase tracking-[0.18em]">
          <Link to="/legal/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">
            Privacy
          </Link>
          <Link to="/legal/terms" className="inline-flex min-h-11 items-center hover:text-foreground">
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}
