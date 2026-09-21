/** Replaying the hard gates against prose they have already judged.
 *
 *  Every script in the database was paid for: a writer call, fourteen judges,
 *  and usually several repair rounds. The verdicts stored beside them are what
 *  the gates concluded at the time. Replaying those verdicts against current
 *  gate code costs nothing and is the only cheap way to see a gate change its
 *  mind - which is the fault that has been most expensive here, because a gate
 *  that starts refusing correct writing fails silently and looks like a bad
 *  writer.
 *
 *  `scripts/export-gate-corpus.mjs` writes the corpus. This module is the
 *  reader, kept separate from the test so it can be exercised against a
 *  hand-built corpus when the exported one is absent. */

import { runHardGates } from "./harness";
import type {
  AnalysisClaim,
  BeatOutline,
  EvidenceItem,
  EvidencePack,
  PerformanceBeat,
  PunditId,
  PunditThesis,
  PunditVariantCandidate,
} from "./types";

export type CorpusPack = {
  id: string;
  drop_id: string | null;
  match_id: string;
  version: number;
  created_at: string;
  facts: EvidenceItem[];
  derivations: EvidenceItem[];
  unavailable_evidence: string[];
};

export type CorpusVariant = {
  id: string;
  drop_id: string;
  pundit_id: string;
  spec_version: number;
  status: string;
  display_script: string;
  spoken_script: string;
  thesis: PunditThesis;
  beat_outline: BeatOutline;
  performance_plan: PerformanceBeat[];
};

export type CorpusClaim = {
  id: string;
  evidence_pack_id: string;
  match_id: string;
  type: AnalysisClaim["type"];
  thesis: string;
  evidence_refs: string[];
  confidence: number;
  alternative_explanation: string | null;
  missing_evidence: string[];
  falsifier: string | null;
  evaluation_rule: AnalysisClaim["evaluationRule"] | null;
};

export type CorpusVerdict = {
  variant_id: string;
  harness_name: string;
  attempt: number;
  passed: boolean;
  failure: string | null;
  evidence_span: string | null;
};

export type GateCorpus = {
  exportedAt: string;
  packs: CorpusPack[];
  variants: CorpusVariant[];
  claims: CorpusClaim[];
  verdicts: CorpusVerdict[];
};

/** The hard gates that are a pure function of the pack, the claims and the
 *  candidate, and can therefore be replayed from stored rows alone.
 *
 *  The four excluded gates are excluded for one reason each, and none of them
 *  is that they matter less:
 *
 *  - `research_originality` needs the corpus of rights-cleared sources as it
 *    stood on the day, which is not stored beside the verdict.
 *  - `humour_safety`, `audio_number_fidelity` and `pronunciation_fidelity` are
 *    driven by flags the caller passes in - a safety review, a transcription,
 *    a pronunciation check - and replaying them would only prove that a
 *    hard-coded flag equals itself.
 *  - `prediction_timestamp` compares a lock time against kickoff, and neither
 *    is a column on the variant row.
 *
 *  Adding a gate here without adding what it reads to the exporter produces a
 *  green replay that proves nothing. */
export const REPLAYABLE_HARD_GATES = [
  "evidence_to_claim_entailment",
  "numeric_licence",
  "entity_licence",
  "consequence_licence",
  "generic_language",
  "unsupported_tactics",
  "spoken_length",
  "display_spoken_identity",
] as const;

export type ReplayableHardGate = (typeof REPLAYABLE_HARD_GATES)[number];

export type ReplayMismatch = {
  variantId: string;
  punditId: string;
  harness: string;
  /** What the gate concluded when the script was written. */
  recorded: boolean;
  /** What the gate concludes now. */
  replayed: boolean;
  recordedFailure?: string;
  replayedFailure?: string;
};

export type ReplaySkip = { variantId: string; reason: string };

export type ReplayReport = {
  replayedVariants: number;
  comparedVerdicts: number;
  skipped: ReplaySkip[];
  mismatches: ReplayMismatch[];
};

function toPack(row: CorpusPack): EvidencePack {
  return {
    id: row.id,
    matchId: row.match_id,
    version: row.version,
    createdAt: row.created_at,
    facts: row.facts ?? [],
    derivations: row.derivations ?? [],
    unavailableEvidence: row.unavailable_evidence ?? [],
  };
}

function toClaim(row: CorpusClaim): AnalysisClaim {
  return {
    id: row.id,
    matchId: row.match_id,
    type: row.type,
    thesis: row.thesis,
    evidenceRefs: row.evidence_refs ?? [],
    confidence: row.confidence,
    ...(row.alternative_explanation ? { alternativeExplanation: row.alternative_explanation } : {}),
    ...(row.missing_evidence?.length ? { missingEvidence: row.missing_evidence } : {}),
    ...(row.falsifier ? { falsifier: row.falsifier } : {}),
    ...(row.evaluation_rule ? { evaluationRule: row.evaluation_rule } : {}),
  };
}

function toCandidate(row: CorpusVariant): PunditVariantCandidate {
  return {
    punditId: row.pundit_id as PunditId,
    specVersion: row.spec_version,
    thesis: row.thesis,
    outline: row.beat_outline,
    displayScript: row.display_script,
    spokenScript: row.spoken_script,
    performancePlan: row.performance_plan ?? [],
    claimIds: row.thesis?.selectedClaimIds ?? [],
  };
}

/** The verdicts that describe the script as it is stored.
 *
 *  A repaired variant carries several attempts and only the last one wrote the
 *  script the row holds, so an earlier attempt's verdict is about prose that no
 *  longer exists. Comparing against it would report a mismatch on every
 *  variant that was ever repaired. */
function finalAttemptVerdicts(verdicts: readonly CorpusVerdict[]): Map<string, CorpusVerdict> {
  const latest = new Map<string, CorpusVerdict>();
  for (const verdict of verdicts) {
    const held = latest.get(verdict.harness_name);
    if (!held || verdict.attempt > held.attempt) latest.set(verdict.harness_name, verdict);
  }
  return latest;
}

export function replayGateCorpus(corpus: GateCorpus): ReplayReport {
  const packsByDrop = new Map<string, CorpusPack>();
  for (const pack of corpus.packs ?? []) {
    if (pack.drop_id) packsByDrop.set(pack.drop_id, pack);
  }

  const verdictsByVariant = new Map<string, CorpusVerdict[]>();
  for (const verdict of corpus.verdicts ?? []) {
    const held = verdictsByVariant.get(verdict.variant_id);
    if (held) held.push(verdict);
    else verdictsByVariant.set(verdict.variant_id, [verdict]);
  }

  const replayable = new Set<string>(REPLAYABLE_HARD_GATES);
  const skipped: ReplaySkip[] = [];
  const mismatches: ReplayMismatch[] = [];
  let replayedVariants = 0;
  let comparedVerdicts = 0;

  for (const variant of corpus.variants ?? []) {
    const pack = packsByDrop.get(variant.drop_id);
    if (!pack) {
      skipped.push({ variantId: variant.id, reason: "no evidence pack exported for its drop" });
      continue;
    }
    const recorded = verdictsByVariant.get(variant.id);
    if (!recorded?.length) {
      skipped.push({ variantId: variant.id, reason: "no hard-gate verdicts stored" });
      continue;
    }
    if (!variant.thesis || !variant.beat_outline) {
      skipped.push({ variantId: variant.id, reason: "exported before thesis and outline were kept" });
      continue;
    }

    const claims = (corpus.claims ?? [])
      .filter((claim) => claim.evidence_pack_id === pack.id)
      .map(toClaim);

    const results = runHardGates({
      pack: toPack(pack),
      claims,
      candidate: toCandidate(variant),
    });
    const now = new Map(results.map((result) => [result.harness, result]));

    replayedVariants += 1;
    for (const [harness, verdict] of finalAttemptVerdicts(recorded)) {
      if (!replayable.has(harness)) continue;
      const current = now.get(harness);
      if (!current) continue;
      comparedVerdicts += 1;
      if (current.passed === verdict.passed) continue;
      mismatches.push({
        variantId: variant.id,
        punditId: variant.pundit_id,
        harness,
        recorded: verdict.passed,
        replayed: current.passed,
        ...(verdict.failure ? { recordedFailure: verdict.failure } : {}),
        ...(current.failure ? { replayedFailure: current.failure } : {}),
      });
    }
  }

  return { replayedVariants, comparedVerdicts, skipped, mismatches };
}
