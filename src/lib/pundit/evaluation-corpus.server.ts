import {
  EVALUATION_SCENARIOS,
  validateEvaluationManifest,
  type EvaluationMatch,
  type EvaluationPartition,
  type EvaluationScenario,
} from "./evaluation";
import { serviceRest, serviceRestAll } from "./service-rest.server";

type MatchRow = {
  id: string;
  kickoff_at: string;
  season: number | null;
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
  home_saves: number | null;
  away_saves: number | null;
};

type EventRow = {
  match_id: string;
  type: string;
  minute: number | null;
  team_id: string | null;
  player_name: string | null;
};

type TeamForm = { values: number[] };

function priorRate(form: Map<string, TeamForm>, teamId: string) {
  const values = form.get(teamId)?.values ?? [];
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5;
}

function updateForm(form: Map<string, TeamForm>, teamId: string, value: number) {
  const current = form.get(teamId)?.values ?? [];
  form.set(teamId, { values: [...current, value].slice(-10) });
}

function classify(input: {
  match: MatchRow;
  stat?: StatRow;
  events: EventRow[];
  homePrior: number;
  awayPrior: number;
}): EvaluationScenario[] {
  const { match, stat, events } = input;
  const scenarios = new Set<EvaluationScenario>();
  const total = match.home_score + match.away_score;
  const margin = Math.abs(match.home_score - match.away_score);
  if (match.home_score === match.away_score && total === 0) scenarios.add("goalless_draw");
  if (match.home_score === match.away_score && total > 0) scenarios.add("score_draw");
  if (margin >= 2 && total <= 4) scenarios.add("routine_win");
  if (total >= 5) scenarios.add("high_scoring");
  if (events.some((event) => ["red", "second_yellow"].includes(event.type))) {
    scenarios.add("red_card");
  }
  if ((stat?.home_saves ?? 0) >= 5 || (stat?.away_saves ?? 0) >= 5) {
    scenarios.add("goalkeeper_performance");
  }
  const homeLost = match.home_score < match.away_score;
  const awayLost = match.away_score < match.home_score;
  if (
    (homeLost &&
      ((stat?.home_xg ?? -99) >= (stat?.away_xg ?? 99) + 0.5 ||
        (stat?.home_shots ?? -99) >= (stat?.away_shots ?? 99) + 5)) ||
    (awayLost &&
      ((stat?.away_xg ?? -99) >= (stat?.home_xg ?? 99) + 0.5 ||
        (stat?.away_shots ?? -99) >= (stat?.home_shots ?? 99) + 5))
  ) {
    scenarios.add("domination_with_defeat");
  }
  const substitutions = events.filter((event) => event.type === "sub" && event.player_name);
  if (
    substitutions.some((substitution) =>
      events.some(
        (event) =>
          ["goal", "penalty_goal"].includes(event.type) &&
          event.player_name === substitution.player_name &&
          (event.minute ?? 0) >= (substitution.minute ?? 0),
      ),
    )
  ) {
    scenarios.add("substitution_impact");
  }
  const goals = events
    .filter((event) => ["goal", "penalty_goal", "own_goal"].includes(event.type))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const lastGoal = goals.at(-1);
  if (lastGoal && (lastGoal.minute ?? 0) >= 85 && margin === 1) scenarios.add("late_winner");
  const homeWon = match.home_score > match.away_score;
  const awayWon = match.away_score > match.home_score;
  if (
    (homeWon && input.homePrior + 0.25 < input.awayPrior) ||
    (awayWon && input.awayPrior + 0.25 < input.homePrior)
  ) {
    scenarios.add("upset");
  }
  if (
    !stat ||
    (stat.home_xg == null &&
      stat.away_xg == null &&
      stat.home_shots == null &&
      stat.away_shots == null)
  ) {
    scenarios.add("poor_data_restraint");
  }
  const scorerCounts = new Map<string, number>();
  for (const goal of goals) {
    if (!goal.player_name) continue;
    scorerCounts.set(goal.player_name, (scorerCounts.get(goal.player_name) ?? 0) + 1);
  }
  if ([...scorerCounts.values()].some((count) => count >= 3)) {
    scenarios.add("extraordinary_action");
  }
  return [...scenarios];
}

function partitionFor(
  index: number,
  scenarios: readonly EvaluationScenario[],
): EvaluationPartition {
  if (index < 12) return "held_out";
  if (scenarios.includes("poor_data_restraint") && index < 20) return "adversarial";
  if (index < 26) return "anti_example";
  return "gold";
}

export async function buildEvaluationCorpus() {
  const matches = await serviceRestAll<MatchRow>(
    "matches?status=eq.finished&season=not.is.null&home_score=not.is.null&away_score=not.is.null&select=id,kickoff_at,season,home_team_id,away_team_id,home_score,away_score&order=kickoff_at.asc",
  );
  const [stats, events, contexts] = await Promise.all([
    serviceRestAll<StatRow>(
      "match_stats?select=match_id,home_xg,away_xg,home_shots,away_shots,home_saves,away_saves",
    ),
    serviceRestAll<EventRow>(
      "match_events?select=match_id,type,minute,team_id,player_name&order=minute.asc",
    ),
    serviceRestAll<{ match_id: string; feeds_agree: boolean | null }>(
      "match_context?select=match_id,feeds_agree",
    ),
  ]);
  const statByMatch = new Map(stats.map((stat) => [stat.match_id, stat]));
  const eventsByMatch = new Map<string, EventRow[]>();
  for (const event of events) {
    eventsByMatch.set(event.match_id, [...(eventsByMatch.get(event.match_id) ?? []), event]);
  }
  const feedAgreement = new Map(contexts.map((row) => [row.match_id, row.feeds_agree]));
  const form = new Map<string, TeamForm>();
  const candidates: Array<{ matchId: string; scenarios: EvaluationScenario[]; score: number }> = [];
  for (const match of matches) {
    const homePrior = priorRate(form, match.home_team_id);
    const awayPrior = priorRate(form, match.away_team_id);
    if (feedAgreement.get(match.id) !== false) {
      const scenarios = classify({
        match,
        stat: statByMatch.get(match.id),
        events: eventsByMatch.get(match.id) ?? [],
        homePrior,
        awayPrior,
      });
      if (scenarios.length) {
        const stat = statByMatch.get(match.id);
        const richness =
          Number(Boolean(stat)) + Number((eventsByMatch.get(match.id)?.length ?? 0) > 0);
        candidates.push({ matchId: match.id, scenarios, score: scenarios.length * 10 + richness });
      }
    }
    const homeValue =
      match.home_score > match.away_score ? 1 : match.home_score === match.away_score ? 0.5 : 0;
    updateForm(form, match.home_team_id, homeValue);
    updateForm(form, match.away_team_id, 1 - homeValue);
  }
  const selected: typeof candidates = [];
  const selectedIds = new Set<string>();
  for (const scenario of EVALUATION_SCENARIOS) {
    const bucket = candidates
      .filter(
        (candidate) =>
          candidate.scenarios.includes(scenario) && !selectedIds.has(candidate.matchId),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    if (!bucket.length) throw new Error(`No eligible evaluation match covers ${scenario}.`);
    for (const candidate of bucket) {
      selected.push(candidate);
      selectedIds.add(candidate.matchId);
    }
  }
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (selected.length >= 60) break;
    if (!selectedIds.has(candidate.matchId)) {
      selected.push(candidate);
      selectedIds.add(candidate.matchId);
    }
  }
  if (selected.length !== 60) {
    throw new Error(`Evaluation corpus requires 60 distinct matches; found ${selected.length}.`);
  }
  const manifest: EvaluationMatch[] = selected.map((candidate, index) => ({
    matchId: candidate.matchId,
    scenarios: candidate.scenarios,
    partition: partitionFor(index, candidate.scenarios),
    promptVisible: index >= 12,
  }));
  const validation = validateEvaluationManifest(manifest);
  if (!validation.passed) throw new Error(validation.failures.join(" "));
  await serviceRest<null>("evaluation_matches?on_conflict=match_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: manifest.map((match) => ({
      match_id: match.matchId,
      scenarios: match.scenarios,
      partition: match.partition,
      prompt_visible: match.promptVisible,
      source: "deterministic-scenario-classifier-v1",
      founder_approved: false,
    })),
  });
  return {
    ...validation,
    counts: Object.fromEntries(
      EVALUATION_SCENARIOS.map((scenario) => [
        scenario,
        manifest.filter((match) => match.scenarios.includes(scenario)).length,
      ]),
    ),
  };
}
