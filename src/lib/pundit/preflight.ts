/** What has to be true before a run is worth paying for.
 *
 *  Every fault this pipeline has hit was discovered by paying for a full
 *  six-pundit run and reading the wreckage: a flag left off, a voice reference
 *  never configured, a release gate that fails closed, a coverage date already
 *  taken. Each of those is knowable in advance and none of them cost anything
 *  to check.
 *
 *  This module is the pure half, so the reasoning is testable without a
 *  database or a live environment. */

export type PreflightReadings = {
  /** Whether each required setting is present. Names only: a value never
   *  leaves the server, and presence is the whole question. */
  configured: Record<string, boolean>;
  prelaunchMode: boolean;
  publicationEnabled: boolean;
  modelStub: boolean;
  release: {
    publicLaunchEnabled: boolean;
    gatesVerifiedAt: string | null;
    snapshotBacked: boolean;
  };
  /** Pundits with a selected voice already recorded, and pundits whose voice
   *  reference is configured in the environment. A run seeds the first from
   *  the second, so either one is enough. */
  punditsWithSelectedVoice: string[];
  punditsWithConfiguredVoice: string[];
  /** A drop already covering the requested date. One drop per date is a unique
   *  constraint, so a second run for the same date fails on persistence, after
   *  the writing has been paid for. */
  existingDrop: { id: string; status: string } | null;
  /** Whether the requested match has the material a pack is built from. */
  match: { id: string; found: boolean; finished: boolean; events: number; hasStats: boolean } | null;
};

export type PreflightReport = PreflightReadings & {
  ready: boolean;
  blockers: string[];
  warnings: string[];
};

const REQUIRED_SETTINGS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "ELEVENLABS_API_KEY",
  "CRON_SECRET",
] as const;

export function assessPreflight(
  readings: PreflightReadings,
  pundits: readonly string[],
): PreflightReport {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const name of REQUIRED_SETTINGS) {
    if (!readings.configured[name]) blockers.push(`${name} is not configured.`);
  }

  const voiced = new Set([
    ...readings.punditsWithSelectedVoice,
    ...readings.punditsWithConfiguredVoice,
  ]);
  const voiceless = pundits.filter((pundit) => !voiced.has(pundit));
  if (voiceless.length) {
    blockers.push(
      `No voice is available for ${voiceless.join(", ")}. Publication requires six distinct licensed voices.`,
    );
  }

  if (readings.prelaunchMode) {
    warnings.push("PRELAUNCH_MODE is on, so a run rehearses and never publishes.");
  } else if (!readings.publicationEnabled) {
    blockers.push("PRELAUNCH_MODE is off and PUNDIT_PUBLICATION_ENABLED is not true.");
  }

  const publishing = !readings.prelaunchMode && readings.publicationEnabled;
  if (readings.modelStub && publishing) {
    blockers.push("PUNDIT_MODEL_STUB is on in a publishing environment.");
  } else if (readings.modelStub) {
    warnings.push("PUNDIT_MODEL_STUB is on, so the scripts will be placeholders.");
  }

  if (publishing) {
    if (!readings.release.publicLaunchEnabled || !readings.release.gatesVerifiedAt) {
      blockers.push("Public launch is fail-closed in release_state.");
    } else if (!readings.release.snapshotBacked) {
      blockers.push("Release state is not backed by a passing immutable gate snapshot.");
    }
  }

  if (readings.existingDrop && readings.existingDrop.status !== "published") {
    warnings.push(
      `A ${readings.existingDrop.status} drop already covers this date and will be reused or will block persistence.`,
    );
  }
  if (readings.existingDrop?.status === "published") {
    blockers.push("A published drop already covers this date and cannot be replaced.");
  }

  const match = readings.match;
  if (match) {
    if (!match.found) blockers.push(`Match ${match.id} is not in the database.`);
    else {
      if (!match.finished) blockers.push(`Match ${match.id} has not finished.`);
      if (!match.events) blockers.push(`Match ${match.id} has no events to build a pack from.`);
      if (!match.hasStats) warnings.push(`Match ${match.id} has no statistics row.`);
    }
  }

  return { ...readings, ready: blockers.length === 0, blockers, warnings };
}
