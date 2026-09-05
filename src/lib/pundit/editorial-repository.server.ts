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
  for (const run of generated.attemptResults) {
    await persistHarnesses(rows[0].id, run.results, run.attempt);
  }
  return rows[0].id;
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
  const approved = input.variants.every((variant) => variant.status === "approved");
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
    status: approved ? "narration_review" : "quarantined",
  } as const;
}
