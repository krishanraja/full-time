import { currentCoverageDate } from "@/lib/london-date";
import { PUNDIT_IDS, type PunditId } from "@/lib/pundit/types";

function publicConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Public Supabase configuration is missing.");
  return { url, key };
}

async function publicRest<T>(path: string): Promise<T> {
  const { url, key } = publicConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(`Editorial API ${response.status}: ${(await response.text()).slice(0, 180)}`);
  return (await response.json()) as T;
}

export function parsePunditId(value: string | null | undefined): PunditId | null {
  return PUNDIT_IDS.includes(value as PunditId) ? (value as PunditId) : null;
}

type PublicDrop = {
  id: string;
  coverage_date: string;
  canonical_pundit: PunditId;
  status: "published" | "off_day";
  published_at: string | null;
};

type PublicVariant = {
  id: string;
  drop_id: string;
  pundit_id: PunditId;
  spec_version: number;
  thesis: Record<string, unknown>;
  title: string;
  description: string;
  display_script: string;
  performance_plan: Array<Record<string, unknown>>;
  audio_url: string;
  audio_bytes: number | null;
  audio_duration_sec: number | null;
  share_image_url: string | null;
  transcript: string | null;
  published_at: string;
};

export async function getPublicToday(pundit: PunditId) {
  const coverageDate = currentCoverageDate();
  const drops = await publicRest<PublicDrop[]>(
    `daily_drops?coverage_date=eq.${encodeURIComponent(coverageDate)}&select=id,coverage_date,canonical_pundit,status,published_at&limit=1`,
  );
  const drop = drops[0] ?? null;
  if (!drop) return { coverageDate, state: "prelaunch", drop: null, variant: null } as const;
  if (drop.status === "off_day")
    return { coverageDate, state: "off_day", drop, variant: null } as const;
  const variants = await publicRest<PublicVariant[]>(
    `pundit_variants?drop_id=eq.${drop.id}&pundit_id=eq.${pundit}&status=eq.published&select=id,drop_id,pundit_id,spec_version,thesis,title,description,display_script,performance_plan,audio_url,audio_bytes,audio_duration_sec,share_image_url,transcript,published_at&limit=1`,
  );
  return {
    coverageDate,
    state: variants[0] ? "published" : "variant_unavailable",
    drop,
    variant: variants[0] ?? null,
  } as const;
}

export async function getPublicVariant(dropId: string, pundit: PunditId) {
  const rows = await publicRest<PublicVariant[]>(
    `pundit_variants?drop_id=eq.${encodeURIComponent(dropId)}&pundit_id=eq.${pundit}&status=eq.published&select=id,drop_id,pundit_id,spec_version,thesis,title,description,display_script,performance_plan,audio_url,audio_bytes,audio_duration_sec,share_image_url,transcript,published_at&limit=1`,
  );
  return rows[0] ?? null;
}

export type ReporterFeedItem = PublicVariant & {
  daily_drops: { coverage_date: string; published_at: string | null } | null;
};

export async function getReporterFeed(limit = 100) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return publicRest<ReporterFeedItem[]>(
    `pundit_variants?pundit_id=eq.zen&status=eq.published&select=id,drop_id,pundit_id,spec_version,thesis,title,description,display_script,performance_plan,audio_url,audio_bytes,audio_duration_sec,share_image_url,transcript,published_at,daily_drops!inner(coverage_date,published_at)&order=published_at.desc&limit=${safeLimit}`,
  );
}

export type PublicPrediction = {
  id: string;
  pundit_id: PunditId;
  match_id: string;
  kickoff_at: string;
  locked_at: string;
  shared_probabilities: Record<string, number>;
  pundit_probabilities: Record<string, number>;
  thesis: string;
  measurable_advantage: string;
  indicator: string;
  expected_turning_point: string;
  falsifier: string;
  evaluation_rule: Record<string, unknown>;
  settlement: { outcome?: "home" | "draw" | "away" } | null;
  status: "open" | "correct" | "partly_correct" | "wrong" | "unjudgeable";
  brier_score: number | null;
  log_loss: number | null;
  receipt: string | null;
  settled_at: string | null;
};

export async function getPublicPredictions(pundit: PunditId, receiptsOnly = false) {
  const settlementFilter = receiptsOnly ? "&status=neq.open" : "";
  const predictions = await publicRest<PublicPrediction[]>(
    `prediction_ledger?pundit_id=eq.${pundit}${settlementFilter}&select=id,pundit_id,match_id,kickoff_at,locked_at,shared_probabilities,pundit_probabilities,thesis,measurable_advantage,indicator,expected_turning_point,falsifier,evaluation_rule,settlement,status,brier_score,log_loss,receipt,settled_at&order=kickoff_at.desc&limit=100`,
  );
  if (process.env.PUBLIC_FORECAST_SCORES_ENABLED === "true") return predictions;
  return predictions.map((prediction) => ({
    ...prediction,
    brier_score: null,
    log_loss: null,
    settlement: null,
  }));
}
