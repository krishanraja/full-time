import { z } from "zod";
import { licenseClaims } from "./claim-lab";
import { anthropicJson } from "./anthropic-json.server";
import {
  publicationDecision,
  requestedRepairs,
  runHardGates,
  validateQualitativeScores,
} from "./harness";
import { getPunditSpec, PUNDIT_SPECS } from "./specs";
import { sha256Hex } from "./hash";
import { maxSourceSimilarity } from "./research-originality";
import { loadRightsClearedOriginalityCorpus } from "./research-originality.server";
import type {
  AnalysisClaim,
  BeatName,
  BeatOutline,
  EvidencePack,
  HarnessResult,
  PerformanceBeat,
  PunditId,
  PunditThesis,
  PunditVariantCandidate,
  QualitativeHarness,
} from "./types";

const claimSchema = z.object({
  claims: z.array(
    z.object({
      type: z.enum([
        "fact",
        "mechanism",
        "decision_quality",
        "probability",
        "counterfactual",
        "opinion",
        "prediction",
      ]),
      thesis: z.string().min(1),
      evidenceRefs: z.array(z.string()).min(1),
      confidence: z.number().min(0).max(1),
      alternativeExplanation: z.string().optional(),
      missingEvidence: z.array(z.string()).optional(),
      falsifier: z.string().optional(),
      evaluationRule: z
        .object({
          metric: z.string(),
          operator: z.enum(["gt", "gte", "lt", "lte", "eq", "between"]),
          value: z.union([z.number(), z.string(), z.tuple([z.number(), z.number()])]),
          window: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

const beatNames = [
  "hook",
  "match_story",
  "evidence",
  "explanation",
  "judgment",
  "counterpoint",
  "humour",
  "portable_line",
  "prediction_or_receipt",
  "close",
] as const;

const beatSchema = z.object({
  name: z.enum(beatNames),
  text: z.string().min(1),
  intent: z.enum([
    "setup",
    "explanation",
    "evidence",
    "pivot",
    "verdict",
    "punchline",
    "prediction",
    "receipt",
  ]),
  pace: z.enum(["slow", "measured", "brisk"]),
  energy: z.number().int().min(1).max(5),
  pauseBeforeMs: z.number().int().min(0).max(1500).optional(),
  emphasis: z.array(z.string()).optional(),
  direction: z.string().optional(),
});

/** Writers sometimes return the ten beats keyed by beat name instead of as an
 *  ordered array. Accept that shape by folding the key back into `name`, in
 *  canonical beat order, so validation judges the content rather than the
 *  container. Anything else is passed through for the schema to reject. */
export function normaliseBeats(value: unknown): unknown {
  if (Array.isArray(value) || !value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>);
  const known = new Set<string>(beatNames);
  const ordered = [
    ...entries
      .filter(([name]) => known.has(name))
      .sort(([a], [b]) => beatNames.indexOf(a as BeatName) - beatNames.indexOf(b as BeatName)),
    ...entries.filter(([name]) => !known.has(name)),
  ];
  return ordered.map(([name, beat]) =>
    beat && typeof beat === "object" && !Array.isArray(beat)
      ? { name, ...(beat as Record<string, unknown>) }
      : beat,
  );
}

const draftSchema = z.object({
  thesis: z.object({
    headline: z.string(),
    judgment: z.string(),
    selectedClaimIds: z.array(z.string()).min(1),
    rejectedClaimIds: z.array(z.string()),
    counterpoint: z.string(),
    changeMyMind: z.string(),
    predictionClaimId: z.string().optional(),
  }),
  beats: z.preprocess(normaliseBeats, z.array(beatSchema).length(10)),
});

const judgeSchema = z.object({
  score: z.number().int().min(1).max(5),
  evidenceSpan: z.string().optional(),
  failure: z.string().optional(),
  requestedRepair: z.string().optional(),
  failedBeats: z.array(z.enum(beatNames)).default([]),
});

const hardJudgeSchema = z.object({
  passed: z.boolean(),
  evidenceSpan: z.string().optional(),
  failure: z.string().optional(),
  requestedRepair: z.string().optional(),
  failedBeats: z.array(z.enum(beatNames)).default([]),
});

function modelNames() {
  return {
    writer: process.env.PUNDIT_WRITER_MODEL ?? process.env.WRITER_MODEL ?? "claude-opus-4-8",
    judge: process.env.PUNDIT_JUDGE_MODEL ?? process.env.JUDGE_MODEL ?? "claude-sonnet-4-6",
  };
}

function compactEvidence(pack: EvidencePack) {
  return {
    matchId: pack.matchId,
    facts: pack.facts,
    derivations: pack.derivations,
    unavailableEvidence: pack.unavailableEvidence,
  };
}

async function deterministicClaimId(matchId: string, index: number, thesis: string) {
  const hex = (await sha256Hex(`${matchId}:${index}:${thesis}`)).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function generateClaimLaboratory(pack: EvidencePack): Promise<AnalysisClaim[]> {
  const output = await anthropicJson({
    model: modelNames().writer,
    maxTokens: 3_000,
    schema: claimSchema,
    system:
      "You are Full Time's claim laboratory. Produce claims, never prose. Facts are closed-world. Causal strength must not exceed the evidence. Do not infer tactics, intent, psychology or film detail from structured match data. Separate decision quality from outcome. Predictions and counterfactuals need a falsifier and structured rule.",
    user: JSON.stringify({
      evidencePack: compactEvidence(pack),
      outputContract: {
        claims: [
          {
            type: "fact | mechanism | decision_quality | probability | counterfactual | opinion | prediction",
            thesis: "string",
            evidenceRefs: ["evidence.id"],
            confidence: "number 0..1",
            alternativeExplanation: "optional string",
            missingEvidence: ["optional missing evidence"],
            falsifier: "required for counterfactual or prediction",
            evaluationRule: {
              metric: "required for counterfactual or prediction",
              operator: "gt | gte | lt | lte | eq | between",
              value: "number | string | [number, number]",
              window: "optional string",
            },
          },
        ],
      },
    }),
  });
  const proposed: AnalysisClaim[] = await Promise.all(
    output.claims.map(async (claim, index) => ({
      ...claim,
      id: await deterministicClaimId(pack.matchId, index, claim.thesis),
      matchId: pack.matchId,
    })),
  );
  const licensed = licenseClaims(proposed, pack).filter((item) => item.licensed);
  if (!licensed.length) throw new Error("Claim laboratory produced no licensed claims.");
  return licensed.map((item) => item.claim);
}

function assembleCandidate(
  punditId: PunditId,
  draft: z.infer<typeof draftSchema>,
  predictionTiming?: { lockedAt: string; kickoffAt: string },
): PunditVariantCandidate {
  const beatsByName = new Map(draft.beats.map((beat) => [beat.name, beat]));
  const missing = beatNames.filter((name) => !beatsByName.has(name));
  if (missing.length) throw new Error(`Writer omitted beats: ${missing.join(", ")}`);
  const ordered = beatNames.map((name) => beatsByName.get(name)!);
  // A prediction is only a prediction when it was registered before kickoff.
  // Without registration timing (the daily show runs after full time) the
  // script may still reason about what comes next, but no claim is recorded
  // as a formal, timestamped prediction.
  if (!predictionTiming)
    draft = { ...draft, thesis: { ...draft.thesis, predictionClaimId: undefined } };
  const outline = Object.fromEntries(ordered.map((beat) => [beat.name, beat.text])) as BeatOutline;
  const displayScript = ordered.map((beat) => beat.text.trim()).join(" ");
  const performancePlan: PerformanceBeat[] = ordered.map((beat) => ({
    text: beat.text.trim(),
    intent: beat.intent,
    pace: beat.pace,
    energy: beat.energy as 1 | 2 | 3 | 4 | 5,
    pauseBeforeMs: beat.pauseBeforeMs,
    emphasis: beat.emphasis,
    direction: beat.direction,
  }));
  const thesis: PunditThesis = { punditId, ...draft.thesis };
  return {
    punditId,
    specVersion: getPunditSpec(punditId).version,
    thesis,
    outline,
    displayScript,
    spokenScript: displayScript,
    performancePlan,
    claimIds: thesis.selectedClaimIds,
    predictionLockedAt: predictionTiming?.lockedAt,
    kickoffAt: predictionTiming?.kickoffAt,
  };
}

async function writeDraft(input: {
  punditId: PunditId;
  pack: EvidencePack;
  claims: AnalysisClaim[];
  prior?: PunditVariantCandidate;
  failures?: ReturnType<typeof requestedRepairs>;
  predictionTiming?: { lockedAt: string; kickoffAt: string };
}): Promise<z.infer<typeof draftSchema>> {
  const spec = getPunditSpec(input.punditId);
  return anthropicJson({
    model: modelNames().writer,
    maxTokens: 6_000,
    schema: draftSchema,
    system:
      "You are the single Full Time showrunner. Write original English; never imitate a living pundit. The evidence is closed-world: every number you write, in digits or words, must be a value present in the evidence pack (a point, three points for a win, eleven players, forty-five and ninety minutes are the only universal constants), and every proper noun must be a team, player, competition or place named in the evidence pack. Copy claim ids exactly from licensedClaims. Produce 750-1100 spoken words across exactly ten named beats. Every judgment needs a reason. Interpret numbers rather than listing them. Humour must intensify insight and stay within the supplied safety boundaries. When repairing, change only failed beats and preserve every passed beat verbatim.",
    user: JSON.stringify({
      punditSpec: spec,
      evidencePack: compactEvidence(input.pack),
      licensedClaims: input.claims,
      priorCandidate: input.prior
        ? { thesis: input.prior.thesis, priorTextByBeatName: input.prior.outline }
        : undefined,
      targetedRepairs: input.failures,
      predictionRegistration: input.predictionTiming
        ? "A registered pre-kickoff prediction exists; you may set predictionClaimId to its licensed prediction claim."
        : "No prediction was registered before kickoff. Omit predictionClaimId. The prediction_or_receipt beat gives a conditional expectation for the next match without a formal prediction.",
      outputContract: {
        thesis: {
          headline: "string",
          judgment: "string",
          selectedClaimIds: ["licensed claim id"],
          rejectedClaimIds: ["licensed claim id"],
          counterpoint: "string",
          changeMyMind: "string",
          predictionClaimId: "optional licensed prediction claim id",
        },
        beats:
          "A JSON array of exactly ten beat objects in beatNames order. Never an object keyed by beat name.",
        beatObjectShape: {
          name: beatNames.join(" | "),
          text: "string",
          intent:
            "setup | explanation | evidence | pivot | verdict | punchline | prediction | receipt",
          pace: "slow | measured | brisk",
          energy: "integer 1..5",
          pauseBeforeMs: "optional integer 0..1500",
          emphasis: ["optional exact words"],
          direction: "optional performance note",
        },
        beatNames,
        words: [750, 1100],
        requiredHumourBeats: "two to four when earned; no quota joke",
        portableLine: "one original, useful concept a fan can recognise next weekend",
      },
    }),
  });
}

function freezePassedBeats(
  draft: z.infer<typeof draftSchema>,
  prior?: PunditVariantCandidate,
  failures?: ReturnType<typeof requestedRepairs>,
) {
  if (!prior || !failures?.length) return draft;
  const repairable = new Set<BeatName>(failures.flatMap((failure) => failure.failedBeats));
  return {
    ...draft,
    beats: draft.beats.map((beat) => {
      if (repairable.has(beat.name)) return beat;
      const index = beatNames.indexOf(beat.name);
      const previous = prior.performancePlan[index];
      return {
        ...beat,
        text: prior.outline[beat.name],
        intent: previous.intent,
        pace: previous.pace,
        energy: previous.energy,
        pauseBeforeMs: previous.pauseBeforeMs,
        emphasis: previous.emphasis,
        direction: previous.direction,
      };
    }),
  };
}

async function judgeOne(
  harness: QualitativeHarness,
  candidate: PunditVariantCandidate,
  pack: EvidencePack,
  claims: AnalysisClaim[],
): Promise<HarnessResult> {
  const output = await anthropicJson({
    model: modelNames().judge,
    maxTokens: 800,
    schema: judgeSchema,
    system: `You are the independent ${harness} judge. Judge only ${harness}; do not reward strengths in any other dimension. Cite the exact script span. Return the smallest repair. A clever line cannot compensate for weak football reasoning.`,
    user: JSON.stringify({
      rubric: harness,
      punditSpec: getPunditSpec(candidate.punditId),
      evidencePack: compactEvidence(pack),
      licensedClaims: claims,
      thesis: candidate.thesis,
      script: candidate.displayScript,
      outputContract: {
        score: "integer 1..5",
        evidenceSpan: "exact script span",
        failure: "required when below threshold",
        requestedRepair: "smallest repair",
        failedBeats: beatNames,
      },
    }),
  });
  return {
    harness,
    hardGate: false,
    passed: false,
    score: output.score as 1 | 2 | 3 | 4 | 5,
    evidenceSpan: output.evidenceSpan,
    failure: output.failure,
    requestedRepair: output.requestedRepair,
    failedBeats: output.failedBeats,
  };
}

async function judgeHardOne(
  harness: "factual_entailment" | "humour_safety_semantic",
  candidate: PunditVariantCandidate,
  pack: EvidencePack,
  claims: AnalysisClaim[],
): Promise<HarnessResult> {
  const factual = harness === "factual_entailment";
  const output = await anthropicJson({
    model: modelNames().judge,
    maxTokens: 900,
    schema: hardJudgeSchema,
    system: factual
      ? "You are a fail-closed factual-entailment judge. Every factual statement, number, entity, score state, attribution and causal strength in the script must be entailed by the closed-world evidence or an explicitly licensed claim. Correlation cannot become intent. Return passed=false for any unsupported assertion and identify every failed beat."
      : "You are a fail-closed humour-safety judge. Reject cruelty, personal humiliation, protected-trait humour, injury, grief, private lives, mental health, or recognizable imitation of a living pundit. Teasing must target decisions, contradictions, institutions, match situations, statistics or football culture. Identify every failed beat.",
    user: JSON.stringify({
      evidencePack: compactEvidence(pack),
      licensedClaims: claims,
      punditSpec: getPunditSpec(candidate.punditId),
      thesis: candidate.thesis,
      beats: candidate.outline,
      outputContract: {
        passed: "boolean",
        evidenceSpan: "exact script span when failed",
        failure: "required when failed",
        requestedRepair: "smallest repair",
        failedBeats: beatNames,
      },
    }),
  });
  return {
    harness,
    hardGate: true,
    passed: output.passed,
    evidenceSpan: output.evidenceSpan,
    failure: output.passed ? undefined : (output.failure ?? `${harness} failed.`),
    requestedRepair: output.passed
      ? undefined
      : (output.requestedRepair ?? "Repair only the identified failed beats."),
    failedBeats: output.passed ? undefined : output.failedBeats,
  };
}

export type GeneratedPunditVariant = {
  candidate: PunditVariantCandidate;
  attempts: number;
  results: HarnessResult[];
  attemptResults: Array<{ attempt: number; results: HarnessResult[] }>;
  status: "approved" | "quarantined";
};

export async function generatePunditVariant(input: {
  punditId: PunditId;
  pack: EvidencePack;
  claims: AnalysisClaim[];
  originalityCorpus?: string[];
  predictionTiming?: { lockedAt: string; kickoffAt: string };
}): Promise<GeneratedPunditVariant> {
  let prior: PunditVariantCandidate | undefined;
  let failures: ReturnType<typeof requestedRepairs> | undefined;
  let latestResults: HarnessResult[] = [];
  const attemptResults: GeneratedPunditVariant["attemptResults"] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const draft = freezePassedBeats(
      await writeDraft({
        ...input,
        prior,
        failures,
        predictionTiming: input.predictionTiming,
      }),
      prior,
      failures,
    );
    const candidate = assembleCandidate(input.punditId, draft, input.predictionTiming);
    const hardResults = runHardGates({
      pack: input.pack,
      claims: input.claims,
      candidate,
      originalitySimilarity: maxSourceSimilarity(
        candidate.displayScript,
        input.originalityCorpus ?? [],
      ),
      originalitySources: input.originalityCorpus ?? [],
    });
    if (hardResults.some((item) => !item.passed)) {
      latestResults = hardResults;
      attemptResults.push({ attempt, results: hardResults });
      prior = candidate;
      failures = requestedRepairs(hardResults);
      continue;
    }

    const harnessNames = Object.keys(
      getPunditSpec(input.punditId).requiredThresholds,
    ) as QualitativeHarness[];
    const [hardJudges, independent] = await Promise.all([
      Promise.all(
        (["factual_entailment", "humour_safety_semantic"] as const).map((harness) =>
          judgeHardOne(harness, candidate, input.pack, input.claims),
        ),
      ),
      Promise.all(
        harnessNames.map((harness) => judgeOne(harness, candidate, input.pack, input.claims)),
      ),
    ]);
    const qualitative = validateQualitativeScores(
      input.punditId,
      Object.fromEntries(independent.map((item) => [item.harness, item])),
    );
    latestResults = [...hardResults, ...hardJudges, ...qualitative];
    attemptResults.push({ attempt, results: latestResults });
    const decision = publicationDecision(latestResults);
    if (decision.publishable) {
      return {
        candidate,
        attempts: attempt,
        results: latestResults,
        attemptResults,
        status: "approved",
      };
    }
    prior = candidate;
    failures = requestedRepairs(latestResults);
  }

  if (!prior) throw new Error("Pundit writer did not produce a candidate.");
  return {
    candidate: prior,
    attempts: 3,
    results: latestResults,
    attemptResults,
    status: "quarantined",
  };
}

export async function generateAllPundits(input: {
  pack: EvidencePack;
  claims?: AnalysisClaim[];
  originalityCorpus?: string[];
  predictionTiming?: { lockedAt: string; kickoffAt: string };
}) {
  const claims = input.claims ?? (await generateClaimLaboratory(input.pack));
  const originalityCorpus = input.originalityCorpus ?? (await loadRightsClearedOriginalityCorpus());
  return Promise.all(
    (Object.keys(PUNDIT_SPECS) as PunditId[]).map((punditId) =>
      generatePunditVariant({
        punditId,
        pack: input.pack,
        claims,
        originalityCorpus,
        predictionTiming: input.predictionTiming,
      }),
    ),
  );
}
