// Shared, client-safe entitlement constants + helpers.
// No secrets, no server-only imports: safe to import from both client and server.

// Billing is paused while the editorial product is in pre-launch. All six
// pundits are public product choices, not subscription entitlements.
export type Tier = "anon" | "free" | "pro";

export type Plan = "free" | "pro";

export type Entitlement = {
  plan: Plan;
  isPro: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
};

// Pundits open to everyone, signed in or not. Preference for anonymous
// listeners lives in localStorage (VOICE_STYLE_STORAGE_KEY below).
export const OPEN_VOICE_STYLES = [
  "zen",
  "gaffer",
  "stats",
  "romantic",
  "doomer",
  "banter",
] as const;

// No pundit requires Pro in the current product doctrine.
export const PRO_VOICE_STYLES = [] as const;

export const VOICE_STYLE_STORAGE_KEY = "ft-voice-style";

export function isProVoiceStyle(id: string): boolean {
  return (PRO_VOICE_STYLES as readonly string[]).includes(id);
}

// Legacy name-a-game limits remain for existing data compatibility. The server
// blocks the generation path throughout pre-launch; these are not current
// product claims.
export const FREE_DAILY_GENERATION_LIMIT = 3;
export const PRO_DAILY_GENERATION_LIMIT = 25;

export function dailyGenerationLimit(isPro: boolean): number {
  return isPro ? PRO_DAILY_GENERATION_LIMIT : FREE_DAILY_GENERATION_LIMIT;
}

/** What a listener may actually play right now. Anyone who picked a Pro
 *  pundit and then lapsed (or was moved off it by this change) falls back to
 *  the house voice rather than being left pointing at something locked. */
export function effectiveVoiceStyle(
  pref: string | null | undefined,
  _isPro?: boolean,
): (typeof OPEN_VOICE_STYLES)[number] {
  const id = pref ?? OPEN_VOICE_STYLES[0];
  return (OPEN_VOICE_STYLES as readonly string[]).includes(id)
    ? (id as (typeof OPEN_VOICE_STYLES)[number])
    : OPEN_VOICE_STYLES[0];
}

// The single source of truth for "is this profile row entitled to Pro right now".
// Pro is parked (nothing user-visible gates on it) but the seam stays for the
// future paid tier. Active/trialing subscription on the pro plan, not past its
// paid period.
export function isProProfile(
  row?: {
    plan?: string | null;
    subscription_status?: string | null;
    current_period_end?: string | null;
  } | null,
): boolean {
  if (!row) return false;
  const active = row.subscription_status === "active" || row.subscription_status === "trialing";
  if (!(row.plan === "pro" && active)) return false;
  if (row.current_period_end) return new Date(row.current_period_end).getTime() > Date.now();
  return true;
}

export const PRO_PRICE_DISPLAY = "$4.99";
export const PRO_PRICE_PERIOD = "/mo";
