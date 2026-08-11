import { describe, expect, it } from "vitest";
import {
  calibrationReport,
  forecastMatch,
  heldOutBacktest,
  trainForecast,
  type HistoricalMatch,
} from "./forecast";

function match(
  id: number,
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number,
): HistoricalMatch {
  return {
    id: String(id),
    kickoffAt: new Date(Date.UTC(2024, 0, id)).toISOString(),
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    homeXg: homeGoals + 0.4,
    awayXg: awayGoals + 0.2,
    homeShots: homeGoals * 4 + 8,
    awayShots: awayGoals * 3 + 6,
  };
}

describe("shared forecast", () => {
  const training = Array.from({ length: 30 }, (_, index) =>
    index % 2 === 0
      ? match(index + 1, "Strong", "Weak", 3, 0)
      : match(index + 1, "Weak", "Strong", 0, 2),
  );

  it("learns team strength while keeping probabilities calibrated", () => {
    const forecast = forecastMatch(trainForecast(training), {
      homeTeam: "Strong",
      awayTeam: "Weak",
    });
    expect(forecast.home).toBeGreaterThan(forecast.away);
    expect(forecast.home + forecast.draw + forecast.away).toBeCloseTo(1, 8);
  });

  it("must beat the league base rate on held-out data before passing", () => {
    const heldOut = Array.from({ length: 100 }, (_, index) =>
      match(index + 40, "Strong", "Weak", 2, 0),
    );
    const result = heldOutBacktest(training, heldOut);
    expect(result.sampleSize).toBe(100);
    expect(result.calibrationBuckets.length).toBeGreaterThan(0);
    expect(result.calibrationError).toBeLessThanOrEqual(0.1);
    expect(result.passed).toBe(true);
  });

  it("reports calibration as observed frequency versus forecast confidence", () => {
    const report = calibrationReport([
      { probabilities: { home: 0.8, draw: 0.1, away: 0.1 }, outcome: "home" },
      { probabilities: { home: 0.8, draw: 0.1, away: 0.1 }, outcome: "away" },
    ]);
    expect(report.buckets.some((bucket) => bucket.meanProbability === 0.8)).toBe(true);
    expect(report.expectedCalibrationError).toBeGreaterThan(0);
  });
});
