import type { PunditId, StructuredRule } from "./types";

export type OutcomeProbabilities = { home: number; draw: number; away: number };

export type RegisteredPrediction = {
  punditId: PunditId;
  matchId: string;
  kickoffAt: string;
  lockedAt: string;
  shared: OutcomeProbabilities;
  pundit: OutcomeProbabilities;
  thesis: string;
  measurableAdvantage: string;
  indicator: string;
  expectedTurningPoint: string;
  evidenceRefs: string[];
  adjustmentEvidenceRefs?: string[];
  falsifier: string;
  settlementRule: StructuredRule;
};

function mostLikelyOutcome(probabilities: OutcomeProbabilities): keyof OutcomeProbabilities {
  return (Object.keys(probabilities) as Array<keyof OutcomeProbabilities>).reduce((best, key) =>
    probabilities[key] > probabilities[best] ? key : best,
  );
}

export function applyPersonaRiskTilt(
  shared: OutcomeProbabilities,
  punditId: PunditId,
): OutcomeProbabilities {
  const favourite = mostLikelyOutcome(shared);
  const tilt = {
    zen: 0,
    gaffer: 0.015,
    stats: 0,
    romantic: -0.03,
    doomer: -0.025,
    banter: -0.015,
  }[punditId];
  if (tilt === 0) return { ...shared };
  const others = (Object.keys(shared) as Array<keyof OutcomeProbabilities>).filter(
    (key) => key !== favourite,
  );
  const available = others.reduce((sum, key) => sum + shared[key], 0);
  const result = { ...shared };
  result[favourite] += tilt;
  for (const key of others) result[key] -= tilt * (shared[key] / available);
  return result;
}

function total(probabilities: OutcomeProbabilities): number {
  return probabilities.home + probabilities.draw + probabilities.away;
}

export function validatePrediction(prediction: RegisteredPrediction): string[] {
  const failures: string[] = [];
  if (new Date(prediction.lockedAt).getTime() > new Date(prediction.kickoffAt).getTime()) {
    failures.push("Prediction must be locked before kickoff.");
  }
  for (const [label, probabilities] of [
    ["shared", prediction.shared],
    ["pundit", prediction.pundit],
  ] as const) {
    if (Object.values(probabilities).some((value) => value < 0 || value > 1)) {
      failures.push(`${label} probabilities must be between 0 and 1.`);
    }
    if (Math.abs(total(probabilities) - 1) > 0.001) {
      failures.push(`${label} probabilities must sum to 1.`);
    }
  }
  for (const outcome of ["home", "draw", "away"] as const) {
    if (
      Math.abs(prediction.pundit[outcome] - prediction.shared[outcome]) > 0.050_001 &&
      !prediction.adjustmentEvidenceRefs?.length
    ) {
      failures.push(
        `${outcome} probability differs from the shared model by more than five points without additional licensed evidence.`,
      );
    }
  }
  if (!prediction.evidenceRefs.length) failures.push("Prediction requires licensed evidence.");
  return failures;
}

export function brierScore(
  probabilities: OutcomeProbabilities,
  outcome: keyof OutcomeProbabilities,
): number {
  return (Object.keys(probabilities) as Array<keyof OutcomeProbabilities>).reduce((sum, key) => {
    const observed = key === outcome ? 1 : 0;
    return sum + (probabilities[key] - observed) ** 2;
  }, 0);
}

export function logLoss(
  probabilities: OutcomeProbabilities,
  outcome: keyof OutcomeProbabilities,
): number {
  const safe = Math.min(1 - 1e-15, Math.max(1e-15, probabilities[outcome]));
  return -Math.log(safe);
}

export function buildReceipt(input: {
  thesis: string;
  result: "correct" | "partly_correct" | "wrong" | "unjudgeable";
  observed: string;
  missedOrOverweighted: string;
}): string {
  return `We believed: ${input.thesis} What happened: ${input.observed} Settlement: ${input.result}. What we missed or overweighted: ${input.missedOrOverweighted}`;
}

export function evaluateSettlementRule(
  rule: StructuredRule,
  observedMetrics: Readonly<Record<string, number | string | null | undefined>>,
): boolean | null {
  const observed = observedMetrics[rule.metric];
  if (observed === null || observed === undefined) return null;
  if (rule.operator === "eq") return String(observed) === String(rule.value);
  if (typeof observed !== "number") return null;
  if (rule.operator === "between") {
    if (!Array.isArray(rule.value) || rule.value.length !== 2) return null;
    return observed >= Number(rule.value[0]) && observed <= Number(rule.value[1]);
  }
  if (typeof rule.value !== "number") return null;
  if (rule.operator === "gt") return observed > rule.value;
  if (rule.operator === "gte") return observed >= rule.value;
  if (rule.operator === "lt") return observed < rule.value;
  if (rule.operator === "lte") return observed <= rule.value;
  return null;
}

export function settlePrediction(input: {
  prediction: RegisteredPrediction;
  outcome: keyof OutcomeProbabilities;
  observedMetrics: Readonly<Record<string, number | string | null | undefined>>;
  observedSummary: string;
  missedOrOverweighted: string;
}) {
  const evaluation = evaluateSettlementRule(input.prediction.settlementRule, input.observedMetrics);
  const directionalCall = mostLikelyOutcome(input.prediction.pundit) === input.outcome;
  const result =
    evaluation === null
      ? "unjudgeable"
      : evaluation && directionalCall
        ? "correct"
        : evaluation || directionalCall
          ? "partly_correct"
          : "wrong";
  return {
    status: result,
    brierScore: brierScore(input.prediction.pundit, input.outcome),
    logLoss: logLoss(input.prediction.pundit, input.outcome),
    receipt: buildReceipt({
      thesis: input.prediction.thesis,
      result,
      observed: input.observedSummary,
      missedOrOverweighted: input.missedOrOverweighted,
    }),
  } as const;
}
