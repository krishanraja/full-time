// Shared, client-safe entitlement constants + helpers.
// No secrets, no server-only imports: safe to import from both client and server.

export type Plan = "free" | "pro";

export type Entitlement = {
  plan: Plan;
  isPro: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
};

// The house voice everyone gets. The rest of the pundits are Full Time Pro.
export const FREE_VOICE_STYLE = "zen" as const;
export const PRO_VOICE_STYLES = ["gaffer", "stats", "romantic", "doomer", "banter"] as const;

export function isProVoiceStyle(id: string): boolean {
  return (PRO_VOICE_STYLES as readonly string[]).includes(id);
}

// The single source of truth for "is this profile row entitled to Pro right now".
// Active/trialing subscription on the pro plan, not past its paid period.
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
