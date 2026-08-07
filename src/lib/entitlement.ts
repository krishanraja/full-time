// Shared, client-safe entitlement constants + helpers.
// No secrets, no server-only imports: safe to import from both client and server.

// The access ladder (docs/15-access-and-waitlist-plan.md), as of 2026-08-07
// when Pro was un-parked and put on live Stripe keys:
//   anon  -> recent drops, continuous playback, local follows, two pundits.
//   free  -> a signed-in account: the same two pundits, plus the archive,
//            name a game at FREE_DAILY_GENERATION_LIMIT, and synced settings.
//   pro   -> $4.99/mo. All six pundits, and name a game at
//            PRO_DAILY_GENERATION_LIMIT.
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
export const OPEN_VOICE_STYLES = ["zen", "gaffer"] as const;

// Pundits that need Pro. These sat behind a free account between Phase 1 and
// 2026-08-07; moving them back behind Pro is what gives the paid tier a real,
// enforced benefit on day one rather than an empty promise.
export const PRO_VOICE_STYLES = ["stats", "romantic", "doomer", "banter"] as const;

export const VOICE_STYLE_STORAGE_KEY = "ft-voice-style";

export function isProVoiceStyle(id: string): boolean {
  return (PRO_VOICE_STYLES as readonly string[]).includes(id);
}

// Name a game, per UTC day. The free allowance is unchanged; Pro is the lever
// that actually costs money to honour (each generation is an Anthropic call
// plus an ElevenLabs render), which is why it is the thing being sold.
export const FREE_DAILY_GENERATION_LIMIT = 3;
export const PRO_DAILY_GENERATION_LIMIT = 25;

export function dailyGenerationLimit(isPro: boolean): number {
  return isPro ? PRO_DAILY_GENERATION_LIMIT : FREE_DAILY_GENERATION_LIMIT;
}

/** What a listener may actually play right now. Anyone who picked a Pro
 *  pundit and then lapsed (or was moved off it by this change) falls back to
 *  the house voice rather than being left pointing at something locked. */
export function effectiveVoiceStyle(pref: string | null | undefined, isPro: boolean): string {
  const id = pref ?? OPEN_VOICE_STYLES[0];
  if (isProVoiceStyle(id) && !isPro) return OPEN_VOICE_STYLES[0];
  return id;
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
