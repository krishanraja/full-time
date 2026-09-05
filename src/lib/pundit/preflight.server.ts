import { getPunditSpec } from "./specs";
import { serviceRest } from "./service-rest.server";
import { assessPreflight, type PreflightReadings, type PreflightReport } from "./preflight";
import { PUNDIT_IDS } from "./types";

type ReleaseRow = {
  public_launch_enabled: boolean | null;
  gates_verified_at: string | null;
  verified_revision: string | null;
  gate_snapshot_hash: string | null;
};
type GateRunRow = { revision: string; snapshot_hash: string; passed: boolean };
type VoiceRow = { pundit_id: string };
type DropRow = { id: string; status: string };
type MatchRow = { id: string; status: string };
type CountRow = { count: number };

const isSet = (name: string) => Boolean(process.env[name]?.trim());

/** Reads the same conditions publish_daily_drop and the workflow will read,
 *  before a run spends anything. */
export async function evaluatePreflight(input: {
  coverageDate: string;
  matchId?: string;
}): Promise<PreflightReport> {
  const configured: Record<string, boolean> = {};
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "ELEVENLABS_API_KEY",
    "CRON_SECRET",
    "API_FOOTBALL_KEY",
  ]) {
    configured[name] = isSet(name);
  }
  const punditsWithConfiguredVoice: string[] = [];
  for (const punditId of PUNDIT_IDS) {
    const key = getPunditSpec(punditId).voiceEnvKey;
    const present = isSet(key) || (punditId === "zen" && isSet("ELEVENLABS_VOICE_ID"));
    configured[key] = isSet(key);
    if (present) punditsWithConfiguredVoice.push(punditId);
  }

  const [release, voices, drops] = await Promise.all([
    serviceRest<ReleaseRow[]>(
      "release_state?singleton=eq.true&select=public_launch_enabled,gates_verified_at,verified_revision,gate_snapshot_hash",
    ),
    serviceRest<VoiceRow[]>("voice_candidates?status=eq.selected&select=pundit_id"),
    serviceRest<DropRow[]>(
      `daily_drops?coverage_date=eq.${encodeURIComponent(input.coverageDate)}&select=id,status&limit=1`,
    ),
  ]);
  const releaseRow = release[0];

  let snapshotBacked = false;
  if (releaseRow?.verified_revision && releaseRow.gate_snapshot_hash) {
    const runs = await serviceRest<GateRunRow[]>(
      `release_gate_runs?revision=eq.${encodeURIComponent(releaseRow.verified_revision)}&snapshot_hash=eq.${encodeURIComponent(releaseRow.gate_snapshot_hash)}&passed=is.true&select=revision,snapshot_hash,passed&limit=1`,
    );
    snapshotBacked = runs.length > 0;
  }

  let match: PreflightReadings["match"] = null;
  if (input.matchId) {
    const id = encodeURIComponent(input.matchId);
    const [rows, events, stats] = await Promise.all([
      serviceRest<MatchRow[]>(`matches?id=eq.${id}&select=id,status&limit=1`),
      serviceRest<CountRow[]>(`match_events?match_id=eq.${id}&select=count`),
      serviceRest<{ match_id: string }[]>(`match_stats?match_id=eq.${id}&select=match_id&limit=1`),
    ]);
    match = {
      id: input.matchId,
      found: rows.length > 0,
      finished: rows[0]?.status === "finished",
      events: Number(events[0]?.count ?? 0),
      hasStats: stats.length > 0,
    };
  }

  const readings: PreflightReadings = {
    configured,
    prelaunchMode: process.env.PRELAUNCH_MODE !== "false",
    publicationEnabled: process.env.PUNDIT_PUBLICATION_ENABLED === "true",
    modelStub: process.env.PUNDIT_MODEL_STUB === "true",
    release: {
      publicLaunchEnabled: releaseRow?.public_launch_enabled === true,
      gatesVerifiedAt: releaseRow?.gates_verified_at ?? null,
      snapshotBacked,
    },
    punditsWithSelectedVoice: [...new Set(voices.map((voice) => voice.pundit_id))],
    punditsWithConfiguredVoice,
    existingDrop: drops[0] ?? null,
    match,
  };
  return assessPreflight(readings, PUNDIT_IDS);
}
