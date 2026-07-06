// Shared, client-safe entitlement constants + helpers.
// No secrets, no server-only imports: safe to import from both client and server.

// The access ladder (docs/15-access-and-waitlist-plan.md):
//   anon  -> recent drops, continuous playback, local follows, two pundits.
//   free  -> a signed-in account: all six pundits, archive, name a game, synced settings.
//   pro   -> parked. Billing plumbing stays wired (test key) but gates nothing user-visible.
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
export const ANON_VOICE_STYLES = ["zen", "gaffer"] as const;

// Pundits that need a (free) account. Selection persists to the profile.
export const ACCOUNT_VOICE_STYLES = ["stats", "romantic", "doomer", "banter"] as const;

export const VOICE_STYLE_STORAGE_KEY = "ft-voice-style";

export function isAccountVoiceStyle(id: string): boolean {
  return (ACCOUNT_VOICE_STYLES as readonly string[]).includes(id);
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
