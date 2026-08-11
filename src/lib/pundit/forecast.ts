import type { OutcomeProbabilities } from "./predictions";

export type HistoricalMatch = {
  id: string;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeXg?: number | null;
  awayXg?: number | null;
  homeShots?: number | null;
  awayShots?: number | null;
  homePromoted?: boolean;
  awayPromoted?: boolean;
};

export type TeamRating = {
  rating: number;
  xgDeltaEma: number;
  shotDeltaEma: number;
  matches: number;
};

export type ForecastModel = {
  ratings: Map<string, TeamRating>;
  homeAdvantage: number;
  drawFactor: number;
  baseRate: OutcomeProbabilities;
};

export type CalibrationBucket = {
  lower: number;
  upper: number;
  count: number;
  meanProbability: number;
  observedRate: number;
};

export function calibrationReport(
  forecasts: readonly {
    probabilities: OutcomeProbabilities;
    outcome: keyof OutcomeProbabilities;
  }[],
) {
  const rows = forecasts.flatMap(({ probabilities, outcome }) =>
    (Object.keys(probabilities) as Array<keyof OutcomeProbabilities>).map((key) => ({
      probability: probabilities[key],
      observed: Number(key === outcome),
    })),
  );
  const buckets: CalibrationBucket[] = [];
  for (let index = 0; index < 10; index++) {
    const values = rows.filter((row) => Math.min(9, Math.floor(row.probability * 10)) === index);
    if (!values.length) continue;
    buckets.push({
      lower: index / 10,
      upper: (index + 1) / 10,
      count: values.length,
      meanProbability: values.reduce((sum, value) => sum + value.probability, 0) / values.length,
      observedRate: values.reduce((sum, value) => sum + value.observed, 0) / values.length,
    });
  }
  const expectedCalibrationError = rows.length
    ? buckets.reduce(
        (sum, bucket) =>
          sum +
          (bucket.count / rows.length) * Math.abs(bucket.meanProbability - bucket.observedRate),
        0,
      )
    : 1;
  return { buckets, expectedCalibrationError };
}

const DEFAULT_RATING = 1500;
const PROMOTED_RATING = 1425;

export function initialTeamRating(promoted = false): TeamRating {
  return {
    rating: promoted ? PROMOTED_RATING : DEFAULT_RATING,
    xgDeltaEma: 0,
    shotDeltaEma: 0,
    matches: 0,
  };
}

export function adjustedTeamRating(team: TeamRating): number {
  return team.rating + team.xgDeltaEma * 18 + team.shotDeltaEma * 0.7;
}

function probabilitiesFromRatings(
  home: TeamRating,
  away: TeamRating,
  homeAdvantage: number,
  drawFactor: number,
): OutcomeProbabilities {
  const homeStrength = 10 ** ((adjustedTeamRating(home) + homeAdvantage) / 400);
  const awayStrength = 10 ** (adjustedTeamRating(away) / 400);
  const drawStrength = drawFactor * Math.sqrt(homeStrength * awayStrength);
  const total = homeStrength + awayStrength + drawStrength;
  return {
    home: homeStrength / total,
    draw: drawStrength / total,
    away: awayStrength / total,
  };
}

function matchOutcome(match: HistoricalMatch): keyof OutcomeProbabilities {
  if (match.homeGoals > match.awayGoals) return "home";
  if (match.homeGoals < match.awayGoals) return "away";
  return "draw";
}

function updateModel(model: ForecastModel, match: HistoricalMatch) {
  const home = model.ratings.get(match.homeTeam) ?? initialTeamRating(match.homePromoted);
  const away = model.ratings.get(match.awayTeam) ?? initialTeamRating(match.awayPromoted);
  const probabilities = probabilitiesFromRatings(home, away, model.homeAdvantage, model.drawFactor);
  const observed =
    match.homeGoals > match.awayGoals ? 1 : match.homeGoals === match.awayGoals ? 0.5 : 0;
  const expected = probabilities.home + probabilities.draw * 0.5;
  const sampleWeight = Math.min(1, 0.45 + Math.log1p(home.matches + away.matches) / 6);
  const delta = 28 * sampleWeight * (observed - expected);
  const xgDelta = match.homeXg == null || match.awayXg == null ? 0 : match.homeXg - match.awayXg;
  const shotDelta =
    match.homeShots == null || match.awayShots == null ? 0 : match.homeShots - match.awayShots;
  const alpha = 0.22;

  model.ratings.set(match.homeTeam, {
    rating: home.rating + delta,
    xgDeltaEma: home.xgDeltaEma * (1 - alpha) + xgDelta * alpha,
    shotDeltaEma: home.shotDeltaEma * (1 - alpha) + shotDelta * alpha,
    matches: home.matches + 1,
  });
  model.ratings.set(match.awayTeam, {
    rating: away.rating - delta,
    xgDeltaEma: away.xgDeltaEma * (1 - alpha) - xgDelta * alpha,
    shotDeltaEma: away.shotDeltaEma * (1 - alpha) - shotDelta * alpha,
    matches: away.matches + 1,
  });
}

export function trainForecast(matches: readonly HistoricalMatch[]): ForecastModel {
  if (!matches.length) throw new Error("Forecast training requires historical matches.");
  const ordered = [...matches].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const counts = { home: 1, draw: 1, away: 1 };
  const model: ForecastModel = {
    ratings: new Map(),
    homeAdvantage: 62,
    drawFactor: 0.82,
    baseRate: { home: 1 / 3, draw: 1 / 3, away: 1 / 3 },
  };
  for (const match of ordered) {
    counts[matchOutcome(match)] += 1;
    updateModel(model, match);
  }
  const total = counts.home + counts.draw + counts.away;
  model.baseRate = {
    home: counts.home / total,
    draw: counts.draw / total,
    away: counts.away / total,
  };
  return model;
}

export function forecastMatch(
  model: ForecastModel,
  input: Pick<HistoricalMatch, "homeTeam" | "awayTeam" | "homePromoted" | "awayPromoted">,
): OutcomeProbabilities {
  return probabilitiesFromRatings(
    model.ratings.get(input.homeTeam) ?? initialTeamRating(input.homePromoted),
    model.ratings.get(input.awayTeam) ?? initialTeamRating(input.awayPromoted),
    model.homeAdvantage,
    model.drawFactor,
  );
}

function score(probabilities: OutcomeProbabilities, outcome: keyof OutcomeProbabilities) {
  return (Object.keys(probabilities) as Array<keyof OutcomeProbabilities>).reduce(
    (sum, key) => sum + (probabilities[key] - Number(key === outcome)) ** 2,
    0,
  );
}

export function heldOutBacktest(
  training: readonly HistoricalMatch[],
  heldOut: readonly HistoricalMatch[],
) {
  if (!heldOut.length) throw new Error("A held-out set is required.");
  const model = trainForecast(training);
  const modelScores: number[] = [];
  const baselineScores: number[] = [];
  const forecasts: Array<{
    probabilities: OutcomeProbabilities;
    outcome: keyof OutcomeProbabilities;
  }> = [];
  for (const match of [...heldOut].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))) {
    const outcome = matchOutcome(match);
    const probabilities = forecastMatch(model, match);
    forecasts.push({ probabilities, outcome });
    modelScores.push(score(probabilities, outcome));
    baselineScores.push(score(model.baseRate, outcome));
    updateModel(model, match);
  }
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const modelBrier = mean(modelScores);
  const baselineBrier = mean(baselineScores);
  const calibration = calibrationReport(forecasts);
  return {
    modelBrier,
    baselineBrier,
    improvement: baselineBrier - modelBrier,
    calibrationBuckets: calibration.buckets,
    calibrationError: calibration.expectedCalibrationError,
    passed: modelBrier < baselineBrier && calibration.expectedCalibrationError <= 0.1,
    sampleSize: heldOut.length,
  };
}
