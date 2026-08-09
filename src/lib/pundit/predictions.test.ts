import { describe, expect, it } from "vitest";
import {
  brierScore,
  applyPersonaRiskTilt,
  logLoss,
  settlePrediction,
  validatePrediction,
  type RegisteredPrediction,
} from "./predictions";

const prediction: RegisteredPrediction = {
  punditId: "stats",
  matchId: "m1",
  kickoffAt: "2026-08-09T15:00:00Z",
  lockedAt: "2026-08-09T14:59:00Z",
  shared: { home: 0.5, draw: 0.25, away: 0.25 },
  pundit: { home: 0.55, draw: 0.23, away: 0.22 },
  thesis: "The home side is more likely to win.",
  measurableAdvantage: "The home side has the stronger adjusted rating.",
  indicator: "Watch the home xG margin.",
  expectedTurningPoint: "The xG edge should appear before the score settles.",
  evidenceRefs: ["forecast.team_strength"],
  falsifier: "A draw or away win falsifies the directional claim.",
  settlementRule: { metric: "result", operator: "eq", value: "home" },
};

describe("prediction accountability", () => {
  it("accepts a five-point persona adjustment", () => {
    expect(validatePrediction(prediction)).toEqual([]);
  });

  it("blocks post-kickoff locks and larger unsupported adjustments", () => {
    expect(
      validatePrediction({
        ...prediction,
        lockedAt: "2026-08-09T15:01:00Z",
        pundit: { home: 0.6, draw: 0.2, away: 0.2 },
      }).join(" "),
    ).toMatch(/before kickoff|more than five/i);
  });

  it("permits a larger adjustment only when extra licensed evidence is declared", () => {
    expect(
      validatePrediction({
        ...prediction,
        pundit: { home: 0.6, draw: 0.2, away: 0.2 },
        adjustmentEvidenceRefs: ["team.news.verified"],
      }),
    ).toEqual([]);
  });

  it("calculates Brier and log loss deterministically", () => {
    expect(brierScore(prediction.shared, "home")).toBeCloseTo(0.375);
    expect(logLoss(prediction.shared, "home")).toBeCloseTo(Math.log(2));
  });

  it("keeps every persona tilt inside the five-point boundary", () => {
    for (const punditId of ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as const) {
      const tilted = applyPersonaRiskTilt(prediction.shared, punditId);
      expect(tilted.home + tilted.draw + tilted.away).toBeCloseTo(1);
      for (const outcome of ["home", "draw", "away"] as const) {
        expect(Math.abs(tilted[outcome] - prediction.shared[outcome])).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it("settles the registered rule without retrospective reinterpretation", () => {
    const settled = settlePrediction({
      prediction,
      outcome: "away",
      observedMetrics: { result: "away" },
      observedSummary: "The away side won.",
      missedOrOverweighted: "We overweighted the home-strength prior.",
    });
    expect(settled.status).toBe("wrong");
    expect(settled.receipt).toContain("Settlement: wrong");
    expect(settled.receipt).toContain("What we missed or overweighted");
  });

  it("awards partial credit only when one registered component lands", () => {
    const settled = settlePrediction({
      prediction,
      outcome: "home",
      observedMetrics: { result: "away" },
      observedSummary: "The home side won without the registered process signal.",
      missedOrOverweighted: "The result call landed but the mechanism did not.",
    });
    expect(settled.status).toBe("partly_correct");
  });
});
