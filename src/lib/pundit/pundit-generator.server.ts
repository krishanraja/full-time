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

/** A model asked for an optional field answers either by omitting it or by
 *  writing an explicit null. Both mean "no value", so both are accepted and
 *  normalised to undefined rather than failing the whole draft. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullish().transform((value: z.infer<T> | null | undefined) => value ?? undefined);
}

/** The same, for a list field whose absence means "nothing". */
function optionalList<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullish().transform((value: z.infer<T> | null | undefined) => value ?? []);
}

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
  pauseBeforeMs: optional(z.number().int().min(0).max(1500)),
  emphasis: optional(z.array(z.string())),
  direction: optional(z.string()),
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
    predictionClaimId: optional(z.string()),
  }),
  beats: z.preprocess(normaliseBeats, z.array(beatSchema).length(10)),
});

/** Exported so the null tolerance above stays covered by a test. */
export const judgeSchema = z.object({
  score: z.number().int().min(1).max(5),
  evidenceSpan: optional(z.string()),
  failure: optional(z.string()),
  requestedRepair: optional(z.string()),
  failedBeats: optionalList(z.array(z.enum(beatNames))),
});

/** A fail-closed gate that rejects a script without saying what is unsupported
 *  gives the writer nothing to repair, so it fails the same beats on every
 *  attempt. A rejection must carry its reason. */
const hardJudgeSchema = z
  .object({
    passed: z.boolean(),
    evidenceSpan: optional(z.string()),
    failure: optional(z.string()),
    requestedRepair: optional(z.string()),
    failedBeats: optionalList(z.array(z.enum(beatNames))),
  })
  .refine((value) => value.passed || Boolean(value.failure?.trim()), {
    message: "A rejection must state what is unsupported and where.",
    path: ["failure"],
  });

function modelNames() {
  return {
    writer: process.env.PUNDIT_WRITER_MODEL ?? process.env.WRITER_MODEL ?? "claude-opus-4-8",
    judge: process.env.PUNDIT_JUDGE_MODEL ?? process.env.JUDGE_MODEL ?? "claude-sonnet-4-6",
  };
}

/** How many repair rounds a single variant gets before it is quarantined. */
export function maxRepairAttempts(): number {
  const configured = Number.parseInt(process.env.PUNDIT_MAX_ATTEMPTS ?? "6", 10);
  return Number.isFinite(configured) ? Math.min(10, Math.max(1, configured)) : 6;
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
      "You are Full Time's claim laboratory. Produce claims, never prose. Facts are closed-world. Causal strength must not exceed the evidence. Do not infer tactics, intent, psychology or film detail from structured match data. Separate decision quality from outcome. Predictions and counterfactuals need a falsifier and structured rule. Every number in a thesis must be one the evidence you cite actually carries, or the number of evidence references you cite. Count your own citations before you state a count: a thesis that says four while listing five events is worse than no claim at all, because every pundit will repeat it.",
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

/** Claim ids are long hashes. Writers transcribe them imperfectly, and a single
 *  wrong character reads as a fabricated claim at the entailment gate. Short
 *  references ("c1", "c2") survive the round trip, so the model never handles a
 *  hash and the real ids are restored here. */
function claimReferences(claims: readonly AnalysisClaim[]) {
  const toReal = new Map(claims.map((claim, index) => [`c${index + 1}`, claim.id]));
  const toRef = new Map(claims.map((claim, index) => [claim.id, `c${index + 1}`]));
  const resolve = (id: string) => toReal.get(id.trim().toLowerCase()) ?? id;
  return {
    listed: claims.map((claim, index) => ({ ...claim, id: `c${index + 1}` })),
    toRef: (id: string) => toRef.get(id) ?? id,
    resolve,
    resolveDraft: (draft: z.infer<typeof draftSchema>): z.infer<typeof draftSchema> => ({
      ...draft,
      thesis: {
        ...draft.thesis,
        selectedClaimIds: draft.thesis.selectedClaimIds.map(resolve),
        rejectedClaimIds: draft.thesis.rejectedClaimIds.map(resolve),
        predictionClaimId: draft.thesis.predictionClaimId
          ? resolve(draft.thesis.predictionClaimId)
          : undefined,
      },
    }),
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
  const claims = claimReferences(input.claims);
  const priorThesis = input.prior
    ? {
        ...input.prior.thesis,
        selectedClaimIds: input.prior.thesis.selectedClaimIds.map(claims.toRef),
        rejectedClaimIds: input.prior.thesis.rejectedClaimIds.map(claims.toRef),
        predictionClaimId: input.prior.thesis.predictionClaimId
          ? claims.toRef(input.prior.thesis.predictionClaimId)
          : undefined,
      }
    : undefined;
  const draft = await anthropicJson({
    model: modelNames().writer,
    maxTokens: 16_000,
    schema: draftSchema,
    system:
      'You are the single Full Time showrunner. Write original English; never imitate a living pundit. The evidence is closed-world: every number you write, in digits or words, must be a value present in the evidence pack (a point, three points for a win, eleven players, forty-five and ninety minutes are the only universal constants), and every proper noun must be a team, player, competition or place named in the evidence pack. Reference claims only by their short id from licensedClaims, such as c1 or c4, and only inside the thesis fields selectedClaimIds, rejectedClaimIds and predictionClaimId. Beat text is read aloud to a listener who cannot see your working: never write a claim id or a phrase such as "per claim c4" or "(c8)" in beat text, and never mention claims, evidence ids or confidence values as labels. State the substance instead. Any number inside a falsifier or a forward-looking condition must also be a value present in the evidence pack, so build conditions out of numbers this match actually produced. Never state a season-level consequence: relegation, survival, the title, European qualification, promotion and play-offs are all outside this evidence. Length is a hard gate: the ten beats together must run to 750-1100 spoken words, so budget roughly 75 to 110 words per beat and expand your reasoning until you are inside that range. Every judgment needs a reason. Interpret numbers rather than listing them. Each beat must advance the argument: never restate an observation a previous beat has already made. The portable line is one sentence a listener could repeat word for word without context. Humour must intensify insight and stay within the supplied safety boundaries, and it has to land as a joke rather than as an observation labelled funny. Build two to four separate humorous moments across the script, each one using a mechanism your own persona spec lists under humourMechanisms; one mild simile in eight hundred words is not enough, and a generic domestic comparison is not your voice. Never announce the joke: do not call anything a comedy, a joke, an irony or absurd, and do not add a sentence afterwards explaining why it was funny. Put the surprise in the last clause of the line and stop there. One concrete image beats a simile that needs unpacking, and a comparison that falls apart when examined is worse than no joke at all. When repairing, change only failed beats and preserve every passed beat verbatim.',
    user: JSON.stringify({
      punditSpec: spec,
      evidencePack: compactEvidence(input.pack),
      licensedClaims: claims.listed,
      priorCandidate: input.prior
        ? { thesis: priorThesis, priorTextByBeatName: input.prior.outline }
        : undefined,
      targetedRepairs: input.failures,
      predictionRegistration: input.predictionTiming
        ? "A registered pre-kickoff prediction exists; you may set predictionClaimId to its licensed prediction claim."
        : "No prediction was registered before kickoff. Omit predictionClaimId. The prediction_or_receipt beat gives a conditional expectation for the next match without a formal prediction.",
      outputContract: {
        thesis: {
          headline: "string",
          judgment: "string",
          selectedClaimIds: ["short licensed claim id, such as c1"],
          rejectedClaimIds: ["short licensed claim id, such as c2"],
          counterpoint: "string",
          changeMyMind: "string",
          predictionClaimId: "optional short licensed prediction claim id",
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
        beatTextRule:
          "Spoken prose only. No claim ids, no evidence ids, no confidence numbers, no bracketed references.",
        words: [750, 1100],
        wordsPerBeat: "roughly 75 to 110; a script under 750 words in total is rejected outright",
        requiredHumourBeats: "two to four when earned; no quota joke",
        portableLine: "one original, useful concept a fan can recognise next weekend",
      },
    }),
  });
  return claims.resolveDraft(draft);
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

/** The judge has to grade the script against the conditions it was written
 *  under. The show runs after full time, so unless a prediction was registered
 *  before kickoff there is no prior claim to settle, and demanding one marks a
 *  script down for obeying the system. */
function predictionContext(predictionTiming?: { lockedAt: string; kickoffAt: string }) {
  return predictionTiming
    ? "A prediction was registered before kickoff. Hold the script to it: it must be settled honestly against the result."
    : "No prediction was registered before kickoff, and the pundit was instructed not to invent one. There is no prior claim to settle, so do not mark the script down for the absence of one. Judge instead how honestly it states that absence and how well it registers a specific, falsifiable forward expectation that a listener could check next time.";
}

async function judgeOne(
  harness: QualitativeHarness,
  candidate: PunditVariantCandidate,
  pack: EvidencePack,
  claims: AnalysisClaim[],
  predictionTiming?: { lockedAt: string; kickoffAt: string },
): Promise<HarnessResult> {
  const output = await anthropicJson({
    model: modelNames().judge,
    maxTokens: 2_000,
    schema: judgeSchema,
    system: `You are the independent ${harness} judge. Judge only ${harness}; do not reward strengths in any other dimension. Cite the exact script span. Return the smallest repair. A clever line cannot compensate for weak football reasoning.`,
    user: JSON.stringify({
      rubric: harness,
      punditSpec: getPunditSpec(candidate.punditId),
      evidencePack: compactEvidence(pack),
      licensedClaims: claims,
      predictionRegistration: predictionContext(predictionTiming),
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
  const explainRejection =
    " When you reject the script you must quote the exact offending span and state plainly what is wrong with it: which assertion is unsupported, and what the evidence does or does not say. A rejection with no specific reason is not a usable answer, because the writer cannot repair what you have not named.";
  let output: z.infer<typeof hardJudgeSchema>;
  try {
    output = await anthropicJson({
      model: modelNames().judge,
      maxTokens: 2_000,
      schema: hardJudgeSchema,
      system:
        (factual
          ? "You are a fail-closed factual-entailment judge. Every factual statement, number, entity, score state, attribution and causal strength in the script must be entailed by the closed-world evidence or an explicitly licensed claim. Correlation cannot become intent. Return passed=false for any unsupported assertion and identify every failed beat."
          : "You are a fail-closed humour-safety judge. Reject cruelty, personal humiliation, protected-trait humour, injury, grief, private lives, mental health, or recognizable imitation of a living pundit. Teasing must target decisions, contradictions, institutions, match situations, statistics or football culture. Identify every failed beat.") +
        explainRejection,
      user: JSON.stringify({
        evidencePack: compactEvidence(pack),
        licensedClaims: claims,
        punditSpec: getPunditSpec(candidate.punditId),
        thesis: candidate.thesis,
        beats: candidate.outline,
        outputContract: {
          passed: "boolean",
          evidenceSpan: "exact script span when failed",
          failure: "required when failed, naming the unsupported assertion",
          requestedRepair: "smallest repair",
          failedBeats: beatNames,
        },
      }),
    });
  } catch (error: unknown) {
    // The gate stays closed when the judge cannot be read, but it says so
    // rather than failing the whole run.
    return {
      harness,
      hardGate: true,
      passed: false,
      failure: `The ${harness} judge did not return a usable judgement: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
      requestedRepair: "Re-run this harness; do not infer its verdict.",
      failedBeats: [...beatNames],
    };
  }
  return {
    harness,
    hardGate: true,
    passed: output.passed,
    evidenceSpan: output.evidenceSpan,
    failure: output.passed ? undefined : output.failure,
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
  // A drop publishes only when all six variants pass at once, so the odds of a
  // whole show turn on how reliably one variant converges. Repairs preserve
  // every passed beat, so an extra attempt only ever refines what is left.
  const maxAttempts = maxRepairAttempts();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        harnessNames.map((harness) =>
          judgeOne(harness, candidate, input.pack, input.claims, input.predictionTiming),
        ),
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
    attempts: maxAttempts,
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
