import { createHash } from "node:crypto";
import {
  heldOutBacktest,
  trainForecast,
  type ForecastModel,
  type HistoricalMatch,
  type TeamRating,
} from "./forecast";
import { serviceRest, serviceRestAll } from "./service-rest.server";

type MatchRow = {
  id: string;
  kickoff_at: string;
  season: number | null;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
};

type StatRow = {
  match_id: string;
  home_xg: number | null;
  away_xg: number | null;
  home_shots: number | null;
  away_shots: number | null;
};

type ForecastModelRow = {
  id: string;
  version: string;
  ratings: Record<string, TeamRating>;
  parameters: {
    homeAdvantage: number;
    drawFactor: number;
    baseRate: ForecastModel["baseRate"];
  };
  passed: boolean;
  active: boolean;
};

function forecastVersion(matches: readonly HistoricalMatch[]) {
  return `strength-${createHash("sha256")
    .update(matches.map((match) => `${match.id}:${match.kickoffAt}`).join("|"))
    .digest("hex")
    .slice(0, 12)}`;
}

function serializeModel(model: ForecastModel) {
  return {
    ratings: Object.fromEntries(model.ratings),
    parameters: {
      homeAdvantage: model.homeAdvantage,
      drawFactor: model.drawFactor,
      baseRate: model.baseRate,
    },
  };
}

export function hydrateForecastModel(row: ForecastModelRow): ForecastModel {
  return {
    ratings: new Map(Object.entries(row.ratings)),
    homeAdvantage: row.parameters.homeAdvantage,
    drawFactor: row.parameters.drawFactor,
    baseRate: row.parameters.baseRate,
  };
}

export async function loadActiveForecastModel() {
  const rows = await serviceRest<ForecastModelRow[]>(
    "forecast_models?active=eq.true&passed=eq.true&select=id,version,ratings,parameters,passed,active&limit=1",
  );
  if (!rows[0]) throw new Error("No passing active forecast model is available.");
  return { row: rows[0], model: hydrateForecastModel(rows[0]) };
}

async function loadHistory(): Promise<{
  matches: HistoricalMatch[];
  seasons: number[];
  firstDate: string;
  lastDate: string;
}> {
  const matches = await serviceRestAll<MatchRow>(
    "matches?status=eq.finished&home_score=not.is.null&away_score=not.is.null&season=not.is.null&select=id,kickoff_at,season,league_id,home_team_id,away_team_id,home_score,away_score&order=kickoff_at.asc",
  );
  if (!matches.length) throw new Error("No season-labelled historical matches are available.");
  const [teams, stats, promoted] = await Promise.all([
    serviceRestAll<{ id: string; name: string }>("teams?select=id,name"),
    serviceRestAll<StatRow>("match_stats?select=match_id,home_xg,away_xg,home_shots,away_shots"),
    serviceRestAll<{ league_id: string; team_id: string; season: number; promoted: boolean }>(
      "team_season_status?select=league_id,team_id,season,promoted",
    ),
  ]);
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const statByMatch = new Map(stats.map((stat) => [stat.match_id, stat]));
  const promotedKeys = new Set(
    promoted
      .filter((row) => row.promoted)
      .map((row) => `${row.league_id}:${row.team_id}:${row.season}`),
  );
  const history = matches.map((match) => {
    const stat = statByMatch.get(match.id);
    return {
      id: match.id,
      kickoffAt: match.kickoff_at,
      homeTeam: teamNames.get(match.home_team_id) ?? match.home_team_id,
      awayTeam: teamNames.get(match.away_team_id) ?? match.away_team_id,
      homeGoals: match.home_score,
      awayGoals: match.away_score,
      homeXg: stat?.home_xg,
      awayXg: stat?.away_xg,
      homeShots: stat?.home_shots,
      awayShots: stat?.away_shots,
      homePromoted: promotedKeys.has(`${match.league_id}:${match.home_team_id}:${match.season}`),
      awayPromoted: promotedKeys.has(`${match.league_id}:${match.away_team_id}:${match.season}`),
    } satisfies HistoricalMatch;
  });
  const seasons = [...new Set(matches.map((match) => match.season!))].sort((a, b) => a - b);
  return {
    matches: history,
    seasons,
    firstDate: history[0].kickoffAt.slice(0, 10),
    lastDate: history.at(-1)!.kickoffAt.slice(0, 10),
  };
}

export async function trainAndBacktestForecast(options: { activate?: boolean } = {}) {
  const history = await loadHistory();
  if (history.seasons.length < 2) {
    throw new Error("Forecast training requires at least two distinct seasons.");
  }
  if (history.matches.length < 500) {
    throw new Error(
      `Forecast training requires at least 500 matches; found ${history.matches.length}.`,
    );
  }
  const heldOutSize = Math.max(100, Math.floor(history.matches.length * 0.2));
  const training = history.matches.slice(0, -heldOutSize);
  const heldOut = history.matches.slice(-heldOutSize);
  const result = heldOutBacktest(training, heldOut);
  const model = trainForecast(history.matches);
  const serialized = serializeModel(model);
  const version = forecastVersion(history.matches);
  const rows = await serviceRest<Array<{ id: string }>>("forecast_models?on_conflict=version", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      version,
      trained_from: history.firstDate,
      trained_to: training.at(-1)!.kickoffAt.slice(0, 10),
      held_out_from: heldOut[0].kickoffAt.slice(0, 10),
      held_out_to: history.lastDate,
      training_matches: training.length,
      held_out_matches: heldOut.length,
      model_brier: result.modelBrier,
      baseline_brier: result.baselineBrier,
      improvement: result.improvement,
      calibration_buckets: result.calibrationBuckets,
      calibration_error: result.calibrationError,
      ratings: serialized.ratings,
      parameters: serialized.parameters,
      passed: result.passed,
      active: false,
    },
  });
  const modelId = rows[0]?.id;
  if (!modelId) throw new Error("Forecast model persistence returned no row.");
  if (options.activate) {
    if (!result.passed) throw new Error("A forecast that misses the baseline cannot be activated.");
    await serviceRest<null>("forecast_models?active=eq.true", {
      method: "PATCH",
      prefer: "return=minimal",
      body: { active: false },
    });
    await serviceRest<null>(`forecast_models?id=eq.${encodeURIComponent(modelId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { active: true },
    });
  }
  return {
    id: modelId,
    version,
    seasons: history.seasons,
    trainingMatches: training.length,
    heldOutMatches: heldOut.length,
    ...result,
    active: Boolean(options.activate && result.passed),
  };
}
