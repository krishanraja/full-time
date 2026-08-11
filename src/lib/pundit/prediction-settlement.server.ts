import {
  settlePrediction,
  type OutcomeProbabilities,
  type RegisteredPrediction,
} from "./predictions";
import type { PunditId, StructuredRule } from "./types";

type LedgerRow = {
  id: string;
  pundit_id: PunditId;
  match_id: string;
  kickoff_at: string;
  locked_at: string;
  shared_probabilities: OutcomeProbabilities;
  pundit_probabilities: OutcomeProbabilities;
  thesis: string;
  measurable_advantage: string;
  indicator: string;
  expected_turning_point: string;
  evidence_refs: string[];
  falsifier: string;
  evaluation_rule: StructuredRule;
};

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Prediction settlement configuration is missing.");
  return { url, key };
}

async function rest<T>(path: string, init?: { method?: "GET" | "PATCH"; body?: unknown }) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Prediction settlement ${response.status}: ${(await response.text()).slice(0, 180)}`,
    );
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function toPrediction(row: LedgerRow): RegisteredPrediction {
  return {
    punditId: row.pundit_id,
    matchId: row.match_id,
    kickoffAt: row.kickoff_at,
    lockedAt: row.locked_at,
    shared: row.shared_probabilities,
    pundit: row.pundit_probabilities,
    thesis: row.thesis,
    measurableAdvantage: row.measurable_advantage,
    indicator: row.indicator,
    expectedTurningPoint: row.expected_turning_point,
    evidenceRefs: row.evidence_refs,
    falsifier: row.falsifier,
    settlementRule: row.evaluation_rule,
  };
}

export async function settleOpenPredictionsForMatches(matchIds: readonly string[]) {
  const uniqueIds = [...new Set(matchIds)];
  let settled = 0;
  let unjudgeable = 0;
  for (const matchId of uniqueIds) {
    const id = encodeURIComponent(matchId);
    const [predictions, matches, stats] = await Promise.all([
      rest<LedgerRow[]>(
        `prediction_ledger?status=eq.open&match_id=eq.${id}&select=id,pundit_id,match_id,kickoff_at,locked_at,shared_probabilities,pundit_probabilities,thesis,measurable_advantage,indicator,expected_turning_point,evidence_refs,falsifier,evaluation_rule`,
      ),
      rest<Array<{ home_score: number; away_score: number }>>(
        `matches?id=eq.${id}&select=home_score,away_score&limit=1`,
      ),
      rest<Array<Record<string, number | string | null>>>(
        `match_stats?match_id=eq.${id}&select=*&limit=1`,
      ),
    ]);
    const match = matches[0];
    if (!match) continue;
    const outcome: keyof OutcomeProbabilities =
      match.home_score > match.away_score
        ? "home"
        : match.home_score < match.away_score
          ? "away"
          : "draw";
    const observedMetrics: Record<string, number | string | null | undefined> = {
      ...(stats[0] ?? {}),
      result: outcome,
      home_score: match.home_score,
      away_score: match.away_score,
      total_goals: match.home_score + match.away_score,
      goal_difference: match.home_score - match.away_score,
      home_xg_margin:
        typeof stats[0]?.home_xg === "number" && typeof stats[0]?.away_xg === "number"
          ? stats[0].home_xg - stats[0].away_xg
          : null,
      away_xg_margin:
        typeof stats[0]?.home_xg === "number" && typeof stats[0]?.away_xg === "number"
          ? stats[0].away_xg - stats[0].home_xg
          : null,
      home_shot_margin:
        typeof stats[0]?.home_shots === "number" && typeof stats[0]?.away_shots === "number"
          ? stats[0].home_shots - stats[0].away_shots
          : null,
      away_shot_margin:
        typeof stats[0]?.home_shots === "number" && typeof stats[0]?.away_shots === "number"
          ? stats[0].away_shots - stats[0].home_shots
          : null,
    };
    for (const row of predictions) {
      const result = settlePrediction({
        prediction: toPrediction(row),
        outcome,
        observedMetrics,
        observedSummary: `The match finished ${match.home_score}-${match.away_score}; the registered result was ${outcome}.`,
        missedOrOverweighted: `The original thesis was tested against ${row.evaluation_rule.metric}; no different test was substituted after kickoff.`,
      });
      await rest<null>(`prediction_ledger?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        body: {
          status: result.status,
          settlement: {
            rule: row.evaluation_rule,
            observed: observedMetrics[row.evaluation_rule.metric] ?? null,
            outcome,
          },
          brier_score: result.brierScore,
          log_loss: result.logLoss,
          receipt: result.receipt,
          settled_at: new Date().toISOString(),
        },
      });
      settled += 1;
      if (result.status === "unjudgeable") unjudgeable += 1;
    }
  }
  return { settled, unjudgeable, matches: uniqueIds.length };
}
