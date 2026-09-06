/** Runs the judge set alone against scripts of known quality.
 *
 *  See calibration.ts for why this exists. In short: the twelve floors have
 *  never been checked against writing anyone agrees is good, and a run that
 *  fails five dimensions across six pundits is as easily an uncalibrated bar as
 *  it is six bad scripts. This tells the two apart for cents rather than for
 *  the price of another full pipeline run.
 *
 *  What it does NOT do, deliberately: write a variant, write a harness row,
 *  narrate anything, repair anything, or publish anything. It reads the sealed
 *  evidence pack and licensed claims that a paid run already produced, and
 *  spends money on judges only. */

import {
  beatsFromProse,
  calibrationVerdict,
  shapeCalibrationScores,
  summariseSubject,
  type CalibrationSubjectResult,
} from "./calibration";
import { onOwnMeter } from "./model-cost";
import { judgeCandidate } from "./pundit-generator.server";
import { serviceRest } from "./service-rest.server";
import { getPunditSpec } from "./specs";
import { PUNDIT_IDS } from "./types";
import type {
  AnalysisClaim,
  BeatOutline,
  EvidenceItem,
  EvidencePack,
  PunditId,
  PunditThesis,
  PunditVariantCandidate,
} from "./types";

/** A calibration reading is worth having only if it is cheap enough to take
 *  again. Fourteen judge calls per script against a cached evidence pack costs
 *  cents, so a ceiling in single dollars is generous and still stops a mistake
 *  from becoming an invoice. */
const CALIBRATION_CEILING_USD = 1.5;

/** Four scripts is enough to read a bar against, and the cap is what stops a
 *  malformed request from turning into fifty judged scripts. */
const MAX_SUBJECTS = 4;

export type CalibrationSubject = {
  /** How this script is named in the report. */
  label: string;
  /** Whose spec and floors to judge against. Use the pundit whose published
   *  script is the pipeline-side comparison, so both sides face one bar. */
  punditId?: PunditId;
  script: string;
};

export type CalibrationReport = {
  matchId: string;
  evidencePackId: string;
  claimCount: number;
  judgeModel: string;
  costUsd: number;
  subjects: CalibrationSubjectResult[];
  verdict: string;
};

type StoredPack = {
  id: string;
  match_id: string;
  version: number;
  sealed_at: string | null;
  facts: EvidenceItem[] | null;
  derivations: EvidenceItem[] | null;
  unavailable_evidence: string[] | null;
};

type StoredClaim = {
  id: string;
  match_id: string;
  type: AnalysisClaim["type"];
  thesis: string;
  evidence_refs: string[] | null;
  confidence: number;
  alternative_explanation: string | null;
  missing_evidence: string[] | null;
  falsifier: string | null;
  evaluation_rule: AnalysisClaim["evaluationRule"] | null;
};

type StoredVariant = {
  id: string;
  drop_id: string;
  pundit_id: PunditId;
  status: string;
  display_script: string;
  thesis: PunditThesis;
  beat_outline: BeatOutline;
};

async function loadDropId(input: { dropId?: string; variantId?: string }): Promise<{
  dropId: string;
  variant?: StoredVariant;
}> {
  if (input.variantId) {
    const rows = await serviceRest<StoredVariant[]>(
      `pundit_variants?id=eq.${encodeURIComponent(input.variantId)}&select=id,drop_id,pundit_id,status,display_script,thesis,beat_outline&limit=1`,
    );
    if (!rows[0]) throw new Error(`Variant ${input.variantId} does not exist.`);
    return { dropId: rows[0].drop_id, variant: rows[0] };
  }
  if (input.dropId) return { dropId: input.dropId };
  throw new Error("Give either a variantId or a dropId to source the evidence pack from.");
}

/** The pack and claims a paid run already sealed. Reading them back is free,
 *  and reusing them is what makes the two sides of the comparison face the
 *  same evidence rather than two different readings of the same match. */
async function loadSealedEvidence(
  dropId: string,
): Promise<{ pack: EvidencePack; claims: AnalysisClaim[] }> {
  const packs = await serviceRest<StoredPack[]>(
    `evidence_packs?drop_id=eq.${encodeURIComponent(dropId)}&select=id,match_id,version,sealed_at,facts,derivations,unavailable_evidence&order=version.desc&limit=1`,
  );
  const stored = packs[0];
  if (!stored) throw new Error(`Drop ${dropId} has no sealed evidence pack to judge against.`);
  const claims = await serviceRest<StoredClaim[]>(
    `analysis_claims?evidence_pack_id=eq.${encodeURIComponent(stored.id)}&select=id,match_id,type,thesis,evidence_refs,confidence,alternative_explanation,missing_evidence,falsifier,evaluation_rule`,
  );
  return {
    pack: {
      id: stored.id,
      matchId: stored.match_id,
      version: stored.version,
      createdAt: stored.sealed_at ?? new Date(0).toISOString(),
      facts: stored.facts ?? [],
      derivations: stored.derivations ?? [],
      unavailableEvidence: stored.unavailable_evidence ?? [],
    },
    claims: claims.map((claim) => ({
      id: claim.id,
      matchId: claim.match_id,
      type: claim.type,
      thesis: claim.thesis,
      evidenceRefs: claim.evidence_refs ?? [],
      confidence: claim.confidence,
      alternativeExplanation: claim.alternative_explanation ?? undefined,
      missingEvidence: claim.missing_evidence ?? [],
      falsifier: claim.falsifier ?? undefined,
      evaluationRule: claim.evaluation_rule ?? undefined,
    })),
  };
}

/** An outside script has no thesis record, so this carries only what the judge
 *  input contract needs to be well formed. The judge is told the record does
 *  not apply and to grade the prose; see PROSE_ONLY_THESIS in the generator. */
function proseCandidate(punditId: PunditId, script: string): PunditVariantCandidate {
  return {
    punditId,
    specVersion: getPunditSpec(punditId).version,
    thesis: {
      punditId,
      headline: "",
      judgment: "",
      selectedClaimIds: [],
      rejectedClaimIds: [],
      counterpoint: "",
      changeMyMind: "",
    },
    outline: beatsFromProse(script),
    displayScript: script,
    spokenScript: script,
    performancePlan: [],
    claimIds: [],
  };
}

export async function runJudgeCalibration(input: {
  dropId?: string;
  variantId?: string;
  subjects: CalibrationSubject[];
  /** Whether to score the stored variant alongside the outside scripts. On by
   *  default when a variantId is given, because a reading with no pipeline side
   *  has nothing to compare against. */
  includeStoredVariant?: boolean;
}): Promise<CalibrationReport> {
  const outside = (input.subjects ?? []).filter((subject) => subject.script?.trim());
  if (outside.length > MAX_SUBJECTS) {
    throw new Error(`At most ${MAX_SUBJECTS} scripts per calibration run; got ${outside.length}.`);
  }
  const { dropId, variant } = await loadDropId(input);
  const includeStored = input.includeStoredVariant ?? Boolean(variant);
  if (!outside.length && !includeStored) {
    throw new Error("Nothing to judge: supply at least one script.");
  }
  const { pack, claims } = await loadSealedEvidence(dropId);
  const defaultPundit = variant?.pundit_id ?? "zen";

  type Planned = { label: string; punditId: PunditId; fromPipeline: boolean; script: string };
  const planned: Planned[] = [];
  if (includeStored && variant) {
    planned.push({
      label: `${variant.pundit_id} (${variant.status}, from the pipeline)`,
      punditId: variant.pundit_id,
      fromPipeline: true,
      script: variant.display_script,
    });
  }
  for (const subject of outside) {
    planned.push({
      label: subject.label,
      punditId: subject.punditId ?? defaultPundit,
      fromPipeline: false,
      script: subject.script,
    });
  }
  for (const item of planned) {
    if (!PUNDIT_IDS.includes(item.punditId)) {
      throw new Error(`Unknown pundit ${item.punditId} for subject ${item.label}.`);
    }
  }

  // Scripts run one after another rather than all at once. The first one pays
  // to write the shared evidence cache and the rest read it, which only happens
  // if the first has finished before the rest start.
  const { result: subjects, costUsd } = await onOwnMeter(CALIBRATION_CEILING_USD, async () => {
    const done: CalibrationSubjectResult[] = [];
    for (const item of planned) {
      // The pipeline side is judged exactly as it was on the day: its own
      // thesis record and its own beats, not a reconstruction of them.
      const candidate =
        item.fromPipeline && variant
          ? {
              ...proseCandidate(item.punditId, item.script),
              thesis: variant.thesis,
              outline: variant.beat_outline,
            }
          : proseCandidate(item.punditId, item.script);
      const results = await judgeCandidate({
        candidate,
        pack,
        claims,
        proseOnly: !item.fromPipeline,
      });
      done.push(
        summariseSubject({
          label: item.label,
          punditId: item.punditId,
          fromPipeline: item.fromPipeline,
          scores: shapeCalibrationScores(results, getPunditSpec(item.punditId).requiredThresholds),
        }),
      );
    }
    return done;
  });

  return {
    matchId: pack.matchId,
    evidencePackId: pack.id,
    claimCount: claims.length,
    judgeModel: process.env.PUNDIT_JUDGE_MODEL ?? process.env.JUDGE_MODEL ?? "claude-sonnet-4-6",
    costUsd: Number(costUsd.toFixed(4)),
    subjects,
    verdict: calibrationVerdict(subjects),
  };
}
