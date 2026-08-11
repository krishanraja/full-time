import { PUNDIT_IDS } from "./types";

export const EVALUATION_SCENARIOS = [
  "routine_win",
  "score_draw",
  "goalless_draw",
  "high_scoring",
  "domination_with_defeat",
  "red_card",
  "goalkeeper_performance",
  "substitution_impact",
  "late_winner",
  "upset",
  "poor_data_restraint",
  "extraordinary_action",
] as const;

export type EvaluationScenario = (typeof EVALUATION_SCENARIOS)[number];
export type EvaluationPartition = "gold" | "anti_example" | "held_out" | "adversarial";

export type EvaluationMatch = {
  matchId: string;
  scenarios: EvaluationScenario[];
  partition: EvaluationPartition;
  promptVisible: boolean;
};

export function validateEvaluationManifest(matches: readonly EvaluationMatch[]) {
  const failures: string[] = [];
  if (matches.length !== 60) failures.push(`Expected 60 matches; received ${matches.length}.`);
  if (new Set(matches.map((match) => match.matchId)).size !== matches.length) {
    failures.push("Evaluation match IDs must be unique.");
  }
  for (const scenario of EVALUATION_SCENARIOS) {
    if (!matches.some((match) => match.scenarios.includes(scenario))) {
      failures.push(`Missing required scenario: ${scenario}.`);
    }
  }
  const heldOut = matches.filter((match) => match.partition === "held_out");
  if (heldOut.length < 12) failures.push("At least 12 matches must remain held out.");
  if (heldOut.some((match) => match.promptVisible)) {
    failures.push("Held-out matches must be invisible to prompts.");
  }
  return {
    passed: failures.length === 0,
    failures,
    expectedScripts: matches.length * PUNDIT_IDS.length,
  };
}
