import { evidenceById } from "./evidence";
import { validatePrediction, type RegisteredPrediction } from "./predictions";
import type { EvidencePack } from "./types";

export type PredictionDraft = Omit<RegisteredPrediction, "lockedAt">;

function serviceConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Prediction registration configuration is missing.");
  return { url, key };
}

export async function registerPrediction(input: {
  draft: PredictionDraft;
  evidencePack: EvidencePack;
  dropId?: string;
  now?: Date;
}) {
  const lockedAt = (input.now ?? new Date()).toISOString();
  const prediction: RegisteredPrediction = { ...input.draft, lockedAt };
  if (prediction.matchId !== input.evidencePack.matchId) {
    throw new Error("Prediction and evidence pack refer to different matches.");
  }
  const evidence = evidenceById(input.evidencePack);
  const unknownRefs = [
    ...prediction.evidenceRefs,
    ...(prediction.adjustmentEvidenceRefs ?? []),
  ].filter((reference) => !evidence.has(reference));
  if (unknownRefs.length) {
    throw new Error(`Prediction cites unknown evidence: ${[...new Set(unknownRefs)].join(", ")}.`);
  }
  const failures = validatePrediction(prediction);
  if (failures.length) throw new Error(`Prediction registration failed: ${failures.join(" ")}`);

  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/rest/v1/prediction_ledger`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      drop_id: input.dropId,
      pundit_id: prediction.punditId,
      match_id: prediction.matchId,
      kickoff_at: prediction.kickoffAt,
      locked_at: prediction.lockedAt,
      shared_probabilities: prediction.shared,
      pundit_probabilities: prediction.pundit,
      thesis: prediction.thesis,
      measurable_advantage: prediction.measurableAdvantage,
      indicator: prediction.indicator,
      expected_turning_point: prediction.expectedTurningPoint,
      evidence_refs: prediction.evidenceRefs,
      adjustment_evidence_refs: prediction.adjustmentEvidenceRefs ?? [],
      falsifier: prediction.falsifier,
      evaluation_rule: prediction.settlementRule,
      status: "open",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Prediction registration ${response.status}: ${(await response.text()).slice(0, 180)}`,
    );
  }
  const rows = (await response.json()) as Array<{ id: string }>;
  if (!rows[0]) throw new Error("Prediction registration returned no ledger row.");
  return { id: rows[0].id, prediction };
}
