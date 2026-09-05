import type { GeneratedPunditVariant } from "./pundit-generator.server";
import { serviceRest } from "./service-rest.server";
import type { BeatOutline, PerformanceBeat, PunditId, PunditThesis } from "./types";

type StoredVariant = {
  id: string;
  drop_id: string;
  pundit_id: PunditId;
  spec_version: number;
  thesis: PunditThesis;
  beat_outline: BeatOutline;
  display_script: string;
  spoken_script: string;
  performance_plan: PerformanceBeat[];
  status: "approved" | "published" | "quarantined" | "failed";
  daily_drops: { coverage_date: string } | null;
};

/** Rebuilds a production request from what is already stored.
 *
 *  Narration, mastering, transcription and the share card are a long path that
 *  runs only after the writing has been paid for. Rehearsing it needs a script,
 *  and a stored one is a script already paid for. The same door recovers a
 *  variant whose narration failed for a reason that has since been fixed,
 *  without rewriting it.
 *
 *  The editorial verdict is read, never asserted: a quarantined variant is
 *  rehydrated as quarantined and production declines it, exactly as it would
 *  have on the day. */
export async function rehydrateVariantForProduction(variantId: string): Promise<{
  dropId: string;
  coverageDate: string;
  variantId: string;
  generated: GeneratedPunditVariant;
  entities: string[];
}> {
  const rows = await serviceRest<StoredVariant[]>(
    `pundit_variants?id=eq.${encodeURIComponent(variantId)}&select=id,drop_id,pundit_id,spec_version,thesis,beat_outline,display_script,spoken_script,performance_plan,status,daily_drops(coverage_date)&limit=1`,
  );
  const stored = rows[0];
  if (!stored) throw new Error(`Variant ${variantId} does not exist.`);
  const coverageDate = stored.daily_drops?.coverage_date;
  if (!coverageDate) throw new Error(`Variant ${variantId} has no coverage date.`);

  const packs = await serviceRest<Array<{ match_id: string }>>(
    `evidence_packs?drop_id=eq.${encodeURIComponent(stored.drop_id)}&select=match_id&limit=1`,
  );
  const matchId = packs[0]?.match_id;
  if (!matchId) throw new Error(`Drop ${stored.drop_id} has no sealed evidence pack.`);
  const { loadStructuredMatch } = await import("./structured-match.server");
  const structured = await loadStructuredMatch(matchId);

  return {
    dropId: stored.drop_id,
    coverageDate,
    variantId: stored.id,
    entities: structured.entities,
    generated: {
      candidate: {
        punditId: stored.pundit_id,
        specVersion: stored.spec_version,
        thesis: stored.thesis,
        outline: stored.beat_outline,
        displayScript: stored.display_script,
        spokenScript: stored.spoken_script,
        performancePlan: stored.performance_plan,
        claimIds: [],
      },
      attempts: 0,
      costUsd: 0,
      results: [],
      attemptResults: [],
      // Published counts as approved: the editorial verdict was reached once
      // and re-narration does not revisit it.
      status: stored.status === "quarantined" || stored.status === "failed"
        ? "quarantined"
        : "approved",
    },
  };
}
