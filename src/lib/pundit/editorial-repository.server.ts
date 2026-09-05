import type { AnalysisClaim, EvidencePack, HarnessResult } from "./types";
import type { GeneratedPunditVariant } from "./pundit-generator.server";
import { sha256Hex } from "./hash";
import { serviceRest } from "./service-rest.server";

function evidenceHash(pack: EvidencePack) {
  return sha256Hex(
    JSON.stringify({
      facts: pack.facts,
      derivations: pack.derivations,
      unavailable: pack.unavailableEvidence,
    }),
  );
}

type IdRow = { id: string };

async function createDrop(coverageDate: string) {
  const existing = await serviceRest<Array<IdRow & { status: string }>>(
    `daily_drops?coverage_date=eq.${coverageDate}&select=id,status&limit=1`,
  );
  if (existing[0]?.status === "published") {
    throw new Error(`Published daily drop ${existing[0].id} is immutable.`);
  }
  if (existing[0]) return existing[0].id;
  const rows = await serviceRest<IdRow[]>("daily_drops", {
    method: "POST",
    prefer: "return=representation",
    body: {
      coverage_date: coverageDate,
      canonical_pundit: "zen",
      status: "building",
      harness_version: "pundit-v1",
    },
  });
  if (!rows[0]) throw new Error("Daily drop was not created.");
  return rows[0].id;
}

async function assertSingleMatchRehearsalSlot(dropId: string, matchId: string) {
  const existing = await serviceRest<Array<{ match_id: string }>>(
    `evidence_packs?drop_id=eq.${dropId}&select=match_id`,
  );
  const conflicting = existing.find((row) => row.match_id !== matchId);
  if (conflicting) {
    throw new Error(
      `Daily drop ${dropId} already contains rehearsal match ${conflicting.match_id}; refusing to overwrite its six variants with ${matchId}.`,
    );
  }
}

async function persistEvidence(dropId: string, pack: EvidencePack) {
  const hash = await evidenceHash(pack);
  const existing = await serviceRest<IdRow[]>(
    `evidence_packs?content_hash=eq.${hash}&select=id&limit=1`,
  );
  if (existing[0]) return existing[0].id;
  const priorVersions = await serviceRest<Array<{ version: number }>>(
    `evidence_packs?match_id=eq.${encodeURIComponent(pack.matchId)}&select=version&order=version.desc&limit=1`,
  );
  const version = Math.max(pack.version, (priorVersions[0]?.version ?? 0) + 1);
  const rows = await serviceRest<IdRow[]>("evidence_packs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      drop_id: dropId,
      match_id: pack.matchId,
      version,
      facts: pack.facts,
      derivations: pack.derivations,
      provenance: [...pack.facts, ...pack.derivations].map((item) => ({
        evidence_id: item.id,
        source: item.source,
        provenance: item.provenance,
      })),
      unavailable_evidence: pack.unavailableEvidence,
      content_hash: hash,
      sealed_at: new Date().toISOString(),
    },
  });
  if (!rows[0]) throw new Error("Evidence pack was not persisted.");
  return rows[0].id;
}

async function persistClaims(evidencePackId: string, claims: AnalysisClaim[]) {
  if (!claims.length) return;
  await serviceRest<null>("analysis_claims?on_conflict=id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: claims.map((claim) => ({
      id: claim.id,
      evidence_pack_id: evidencePackId,
      match_id: claim.matchId,
      type: claim.type,
      thesis: claim.thesis,
      evidence_refs: claim.evidenceRefs,
      confidence: claim.confidence,
      alternative_explanation: claim.alternativeExplanation,
      missing_evidence: claim.missingEvidence ?? [],
      falsifier: claim.falsifier,
      evaluation_rule: claim.evaluationRule,
      status: "licensed",
    })),
  });
}

async function persistHarnesses(variantId: string, results: HarnessResult[], attempt: number) {
  await serviceRest<null>(
    "harness_runs?on_conflict=variant_id,harness_name,harness_version,attempt",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: results.map((item) => ({
        variant_id: variantId,
        harness_name: item.harness,
        harness_version: "pundit-v1",
        model: item.hardGate
          ? "deterministic-code"
          : (process.env.PUNDIT_JUDGE_MODEL ?? process.env.JUDGE_MODEL ?? "claude-sonnet-4-6"),
        hard_gate: item.hardGate,
        attempt,
        score: item.score,
        evidence_span: item.evidenceSpan,
        failure: item.failure,
        requested_repair: item.requestedRepair,
        result: item,
        passed: item.passed,
      })),
    },
  );
}

async function persistVariant(dropId: string, generated: GeneratedPunditVariant) {
  const candidate = generated.candidate;
  const rows = await serviceRest<IdRow[]>("pundit_variants?on_conflict=drop_id,pundit_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      drop_id: dropId,
      pundit_id: candidate.punditId,
      spec_version: candidate.specVersion,
      thesis: candidate.thesis,
      beat_outline: candidate.outline,
      title: candidate.thesis.headline,
      description: candidate.thesis.judgment,
      display_script: candidate.displayScript,
      spoken_script: candidate.spokenScript,
      performance_plan: candidate.performancePlan,
      harness_version: "pundit-v1",
      status: generated.status,
      approved_at: generated.status === "approved" ? new Date().toISOString() : null,
    },
  });
  if (!rows[0]) throw new Error(`Variant ${candidate.punditId} was not persisted.`);
  // A re-run of the same date reuses the drop and its variants, and harness rows
  // are keyed by attempt number. So a pundit that failed at attempt two last
  // time and passes at attempt one this time would leave the old failing rows
  // in place, and they win the "latest attempt" ordering that both the publish
  // gate and the promise checks read. The verdicts on a variant are the
  // verdicts of the run that wrote its script, so the previous run's are
  // cleared with it.
  await serviceRest<null>(`harness_runs?variant_id=eq.${rows[0].id}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  for (const run of generated.attemptResults) {
    await persistHarnesses(rows[0].id, run.results, run.attempt);
  }
  return rows[0].id;
}

/** The harnesses that failed for every single variant.
 *
 *  Six pundits share one evidence pack and one claim set, so a fault in either
 *  reaches all of them at once and shows up as the same harness failing six
 *  times. That pattern is worth naming, because the repair loop cannot fix an
 *  input it is not allowed to question. */
function failedByEveryVariant(variants: GeneratedPunditVariant[]): string[] {
  if (!variants.length) return [];
  const failuresFor = (variant: GeneratedPunditVariant) =>
    new Set(variant.results.filter((result) => !result.passed).map((result) => result.harness));
  const [first, ...rest] = variants.map(failuresFor);
  return [...first].filter((harness) => rest.every((other) => other.has(harness))).sort();
}

export async function persistEditorialRehearsal(input: {
  coverageDate: string;
  pack: EvidencePack;
  claims: AnalysisClaim[];
  variants: GeneratedPunditVariant[];
}) {
  const dropId = await createDrop(input.coverageDate);
  await assertSingleMatchRehearsalSlot(dropId, input.pack.matchId);
  const evidencePackId = await persistEvidence(dropId, input.pack);
  await persistClaims(evidencePackId, input.claims);
  const variantIds = await Promise.all(
    input.variants.map(async (variant) => ({
      punditId: variant.candidate.punditId,
      variantId: await persistVariant(dropId, variant),
    })),
  );
  // A listener plays one pundit, so a drop needs one pundit ready, not six. The
  // per-variant bar is untouched: a variant reaches narration only by passing
  // every one of its own harnesses.
  const approvedPundits = input.variants
    .filter((variant) => variant.status === "approved")
    .map((variant) => variant.candidate.punditId);
  const approved = approvedPundits.length > 0;
  // A harness that fails for every pundit at once is not six writers each
  // having a bad day: it is one shared input they all read the same way. Both
  // times a whole show has been lost, the cause was a single claim that
  // miscounted itself, and both times it was found by reading judge prose
  // rather than by the run saying so. Now the run says so.
  const sharedFailures = failedByEveryVariant(input.variants);
  // Each pundit runs as its own step and reports what it spent. Summing here is
  // the only place with all six in hand, and the figure is what an on-demand
  // unlock has to be priced against.
  const generationCostUsd = input.variants.reduce(
    (total, variant) => total + (variant.costUsd ?? 0),
    0,
  );
  await serviceRest<null>(`daily_drops?id=eq.${dropId}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: approved ? "narration_review" : "quarantined",
      generation_cost_usd: Number(generationCostUsd.toFixed(4)),
    },
  });
  return {
    dropId,
    evidencePackId,
    variantIds,
    approvedPundits,
    sharedFailures,
    status: approved ? "narration_review" : "quarantined",
  } as const;
}
