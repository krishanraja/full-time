import { createHash } from "node:crypto";
import {
  adjustedTeamRating,
  forecastMatch,
  initialTeamRating,
  type TeamRating,
} from "./forecast";
import { loadActiveForecastModel } from "./forecast-training.server";
import { registerPrediction, type PredictionDraft } from "./prediction-registration.server";
import { applyPersonaRiskTilt } from "./predictions";
import { serviceRest } from "./service-rest.server";
import { PUNDIT_IDS, type AnalysisClaim, type EvidencePack, type PunditId } from "./types";

const LEAGUES = [
  { providerId: 39, id: "af_39", name: "Premier League", country: "England" },
  { providerId: 140, id: "af_140", name: "La Liga", country: "Spain" },
  { providerId: 135, id: "af_135", name: "Serie A", country: "Italy" },
  { providerId: 78, id: "af_78", name: "Bundesliga", country: "Germany" },
  { providerId: 61, id: "af_61", name: "Ligue 1", country: "France" },
] as const;

type ProviderFixture = {
  fixture?: { id?: number; date?: string; status?: { short?: string } };
  teams?: {
    home?: { id?: number; name?: string; logo?: string };
    away?: { id?: number; name?: string; logo?: string };
  };
};

type UpcomingMatch = {
  id: string;
  kickoff_at: string;
  league_id: string;
  season: number;
  home_team_id: string;
  away_team_id: string;
  home: { name: string } | null;
  away: { name: string } | null;
};

const PERSPECTIVES: Record<PunditId, string> = {
  zen: "The responsible call is the most likely outcome, with the uncertainty left visible.",
  gaffer: "A sound pre-match decision starts with the result the evidence makes most defensible.",
  stats: "The favourite is a probability, not an appointment with destiny.",
  romantic:
    "The underdog still owns the part of the probability chart where football keeps its magic.",
  doomer: "Even the favourite carries a clearly measured route to disappointment.",
  banter: "Reputation can make noise; the registered probability is the part that has to pay rent.",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shortName(name: string) {
  return (
    name
      .replace(/[^A-Za-z ]/g, "")
      .trim()
      .slice(0, 3)
      .toUpperCase() || "CLB"
  );
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function apiFootball(path: string) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is missing.");
  await sleep(300);
  const response = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": key },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Upcoming fixture provider returned ${response.status}.`);
  const payload = (await response.json()) as {
    errors?: Record<string, unknown>;
    response?: ProviderFixture[];
  };
  if (payload.errors && Object.keys(payload.errors).length) {
    throw new Error(`Upcoming fixture provider error: ${JSON.stringify(payload.errors)}`);
  }
  return payload.response ?? [];
}

export async function syncUpcomingFixtures(now = new Date()) {
  const season = Number(process.env.FT_SEASON ?? now.getUTCFullYear());
  const from = dateOnly(now);
  const to = dateOnly(new Date(now.getTime() + 3 * 86_400_000));
  const fixtures: Array<{ league: (typeof LEAGUES)[number]; fixture: ProviderFixture }> = [];
  for (const league of LEAGUES) {
    const rows = await apiFootball(
      `/fixtures?league=${league.providerId}&season=${season}&from=${from}&to=${to}&timezone=Europe%2FLondon`,
    );
    for (const fixture of rows) {
      if (["NS", "TBD"].includes(fixture.fixture?.status?.short ?? "")) {
        fixtures.push({ league, fixture });
      }
    }
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("leagues").upsert(
    LEAGUES.map((league) => ({
      id: league.id,
      name: league.name,
      country: league.country,
    })),
    { onConflict: "id" },
  );
  const teams = new Map<
    string,
    { id: string; name: string; short: string; league_id: string; crest_url: string | null }
  >();
  for (const { league, fixture } of fixtures) {
    for (const team of [fixture.teams?.home, fixture.teams?.away]) {
      if (!team?.id || !team.name) continue;
      teams.set(`af_${team.id}`, {
        id: `af_${team.id}`,
        name: team.name,
        short: shortName(team.name),
        league_id: league.id,
        crest_url: team.logo ?? null,
      });
    }
  }
  if (teams.size) {
    const { error } = await supabaseAdmin.from("teams").upsert([...teams.values()], {
      onConflict: "id",
    });
    if (error) throw new Error(error.message);
  }
  const matches = fixtures.flatMap(({ league, fixture }) => {
    const id = fixture.fixture?.id;
    const kickoff = fixture.fixture?.date;
    const homeId = fixture.teams?.home?.id;
    const awayId = fixture.teams?.away?.id;
    if (!id || !kickoff || !homeId || !awayId) return [];
    return [
      {
        id: `af_${id}`,
        league_id: league.id,
        home_team_id: `af_${homeId}`,
        away_team_id: `af_${awayId}`,
        kickoff_at: kickoff,
        status: "scheduled",
        season,
      },
    ];
  });
  if (matches.length) {
    await serviceRest<null>("matches?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: matches,
    });
  }
  return { synced: matches.length, from, to, season };
}

function rounded(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function predictionPack(input: {
  match: UpcomingMatch;
  version: string;
  shared: { home: number; draw: number; away: number };
  homeRating: TeamRating;
  awayRating: TeamRating;
  homeAdvantage: number;
}): EvidencePack {
  const { match, shared } = input;
  return {
    id: `prematch:${match.id}:${input.version}`,
    matchId: match.id,
    version: 0,
    createdAt: new Date().toISOString(),
    facts: [
      {
        id: "match.home_team",
        kind: "fact",
        label: "Home team",
        value: match.home?.name ?? match.home_team_id,
        source: "database-verified",
        provenance: match.id,
      },
      {
        id: "match.away_team",
        kind: "fact",
        label: "Away team",
        value: match.away?.name ?? match.away_team_id,
        source: "database-verified",
        provenance: match.id,
      },
      {
        id: "match.kickoff_at",
        kind: "fact",
        label: "Kickoff",
        value: match.kickoff_at,
        source: "api-football",
        provenance: match.id,
      },
      {
        id: "forecast.model_version",
        kind: "fact",
        label: "Forecast model",
        value: input.version,
        source: "held-out-backtested-model",
        provenance: input.version,
      },
    ],
    derivations: [
      {
        id: "forecast.home_probability",
        kind: "derived",
        label: "Home win probability",
        value: rounded(shared.home),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "rating model probability",
      },
      {
        id: "forecast.draw_probability",
        kind: "derived",
        label: "Draw probability",
        value: rounded(shared.draw),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "rating model probability",
      },
      {
        id: "forecast.away_probability",
        kind: "derived",
        label: "Away win probability",
        value: rounded(shared.away),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "rating model probability",
      },
      {
        id: "forecast.home_rating",
        kind: "derived",
        label: "Home strength rating",
        value: rounded(input.homeRating.rating),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted result, xG and shot model",
      },
      {
        id: "forecast.away_rating",
        kind: "derived",
        label: "Away strength rating",
        value: rounded(input.awayRating.rating),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted result, xG and shot model",
      },
      {
        id: "forecast.home_adjusted_strength",
        kind: "derived",
        label: "Home adjusted strength",
        value: rounded(adjustedTeamRating(input.homeRating) + input.homeAdvantage),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "rating + home advantage + 18*xG-delta EMA + 0.7*shot-delta EMA",
      },
      {
        id: "forecast.away_adjusted_strength",
        kind: "derived",
        label: "Away adjusted strength",
        value: rounded(adjustedTeamRating(input.awayRating)),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "rating + 18*xG-delta EMA + 0.7*shot-delta EMA",
      },
      {
        id: "forecast.home_xg_trend",
        kind: "derived",
        label: "Home xG-delta trend",
        value: rounded(input.homeRating.xgDeltaEma),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted exponential moving average of xG difference",
      },
      {
        id: "forecast.away_xg_trend",
        kind: "derived",
        label: "Away xG-delta trend",
        value: rounded(input.awayRating.xgDeltaEma),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted exponential moving average of xG difference",
      },
      {
        id: "forecast.home_shot_trend",
        kind: "derived",
        label: "Home shot-delta trend",
        value: rounded(input.homeRating.shotDeltaEma),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted exponential moving average of shot difference",
      },
      {
        id: "forecast.away_shot_trend",
        kind: "derived",
        label: "Away shot-delta trend",
        value: rounded(input.awayRating.shotDeltaEma),
        source: "held-out-backtested-model",
        provenance: input.version,
        formula: "recency-weighted exponential moving average of shot difference",
      },
    ],
    unavailableEvidence: [
      "film and tracking data",
      "coaching intent",
      "unlicensed injury or team-news context",
    ],
  };
}

function evidenceHash(pack: EvidencePack) {
  return createHash("sha256")
    .update(JSON.stringify({ facts: pack.facts, derivations: pack.derivations }))
    .digest("hex");
}

async function persistPredictionEvidence(pack: EvidencePack) {
  const hash = evidenceHash(pack);
  const existing = await serviceRest<Array<{ id: string }>>(
    `evidence_packs?match_id=eq.${encodeURIComponent(pack.matchId)}&version=eq.0&select=id&limit=1`,
  );
  if (existing[0]) return existing[0].id;
  const rows = await serviceRest<Array<{ id: string }>>("evidence_packs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      match_id: pack.matchId,
      version: 0,
      facts: pack.facts,
      derivations: pack.derivations,
      provenance: [...pack.facts, ...pack.derivations].map((item) => ({
        evidence_id: item.id,
        source: item.source,
        provenance: item.provenance,
      })),
      unavailable_evidence: pack.unavailableEvidence,
      content_hash: hash,
      sealed_at: new Date().toISOString(),
    },
  });
  if (!rows[0]) throw new Error("Pre-match evidence persistence returned no row.");
  return rows[0].id;
}

function predictedOutcome(shared: { home: number; draw: number; away: number }) {
  return (Object.entries(shared) as Array<["home" | "draw" | "away", number]>).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

function predictionClaim(input: {
  punditId: PunditId;
  match: UpcomingMatch;
  shared: { home: number; draw: number; away: number };
  homeRating: TeamRating;
  awayRating: TeamRating;
  homeAdvantage: number;
}) {
  const punditProbabilities = applyPersonaRiskTilt(input.shared, input.punditId);
  const outcome = predictedOutcome(punditProbabilities);
  const homeName = input.match.home?.name ?? "the home side";
  const awayName = input.match.away?.name ?? "the away side";
  const outcomeName = outcome === "home" ? homeName : outcome === "away" ? awayName : "the draw";
  const homeStrength = adjustedTeamRating(input.homeRating) + input.homeAdvantage;
  const awayStrength = adjustedTeamRating(input.awayRating);
  const strengthSide = homeStrength >= awayStrength ? "home" : "away";
  const strengthTeam = strengthSide === "home" ? homeName : awayName;
  const strengthGap = Math.abs(homeStrength - awayStrength);
  const xgTrendEdge = input.homeRating.xgDeltaEma - input.awayRating.xgDeltaEma;
  const shotTrendEdge = input.homeRating.shotDeltaEma - input.awayRating.shotDeltaEma;
  const usesXg = Math.abs(xgTrendEdge * 18) >= Math.abs(shotTrendEdge * 0.7);
  const processEdge = usesXg ? xgTrendEdge : shotTrendEdge;
  const processSide = processEdge >= 0 ? "home" : "away";
  const processTeam = processSide === "home" ? homeName : awayName;
  const processMetric = `${processSide}_${usesXg ? "xg" : "shot"}_margin`;
  const processLabel = usesXg ? "xG" : "shot";
  const processValue = Math.abs(processEdge);
  const probability = punditProbabilities[outcome];
  const measurableAdvantage = `${strengthTeam} hold a ${Math.round(strengthGap)}-point adjusted team-strength edge in the shared model.`;
  const indicator = `${processTeam} carry the stronger recent ${processLabel} differential by ${processValue.toFixed(2)} per match.`;
  const expectedTurningPoint = `Expect that process edge to show in the full-time ${processLabel} margin before treating the score as proof of the pre-match thesis.`;
  const thesis = `${PERSPECTIVES[input.punditId]} The registered call is ${outcomeName} at ${Math.round(probability * 100)} percent. ${measurableAdvantage}`;
  const digest = createHash("sha256")
    .update(`${input.match.id}:${input.punditId}:${thesis}`)
    .digest("hex")
    .slice(0, 32);
  const claim: AnalysisClaim = {
    id: `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`,
    matchId: input.match.id,
    type: "prediction",
    thesis,
    evidenceRefs: [
      "forecast.home_probability",
      "forecast.draw_probability",
      "forecast.away_probability",
      "forecast.home_adjusted_strength",
      "forecast.away_adjusted_strength",
      ...(usesXg
        ? ["forecast.home_xg_trend", "forecast.away_xg_trend"]
        : ["forecast.home_shot_trend", "forecast.away_shot_trend"]),
    ],
    confidence: probability,
    alternativeExplanation: `The other outcomes retain ${(1 - probability).toFixed(3)} combined probability, and the structured data cannot establish the tactical reason in advance.`,
    falsifier: `The process claim fails if ${processTeam} finish with a negative ${processLabel} margin. The result probability is scored separately.`,
    evaluationRule: { metric: processMetric, operator: "gte", value: 0 },
  };
  return {
    claim,
    punditProbabilities,
    measurableAdvantage,
    indicator,
    expectedTurningPoint,
  };
}

export async function registerUpcomingPredictions(now = new Date()) {
  const sync = await syncUpcomingFixtures(now);
  const { row: forecastRow, model } = await loadActiveForecastModel();
  const from = new Date(now.getTime() + 60 * 60_000).toISOString();
  const to = new Date(now.getTime() + 36 * 60 * 60_000).toISOString();
  const matches = await serviceRest<UpcomingMatch[]>(
    `matches?status=eq.scheduled&season=not.is.null&kickoff_at=gte.${encodeURIComponent(from)}&kickoff_at=lt.${encodeURIComponent(to)}&select=id,kickoff_at,league_id,season,home_team_id,away_team_id,home:home_team_id(name),away:away_team_id(name)&order=kickoff_at.asc`,
  );
  let registered = 0;
  let skipped = 0;
  for (const match of matches) {
    const existing = await serviceRest<Array<{ pundit_id: PunditId }>>(
      `prediction_ledger?match_id=eq.${encodeURIComponent(match.id)}&select=pundit_id`,
    );
    const existingPundits = new Set(existing.map((row) => row.pundit_id));
    if (existingPundits.size === PUNDIT_IDS.length) {
      skipped += PUNDIT_IDS.length;
      continue;
    }
    const homeName = match.home?.name ?? match.home_team_id;
    const awayName = match.away?.name ?? match.away_team_id;
    const promoted = await serviceRest<Array<{ team_id: string }>>(
      `team_season_status?league_id=eq.${encodeURIComponent(match.league_id)}&season=eq.${match.season}&promoted=eq.true&team_id=in.(${encodeURIComponent(match.home_team_id)},${encodeURIComponent(match.away_team_id)})&select=team_id`,
    );
    const promotedTeams = new Set(promoted.map((row) => row.team_id));
    const homePromoted = promotedTeams.has(match.home_team_id);
    const awayPromoted = promotedTeams.has(match.away_team_id);
    const shared = forecastMatch(model, {
      homeTeam: homeName,
      awayTeam: awayName,
      homePromoted,
      awayPromoted,
    });
    const homeRating = model.ratings.get(homeName) ?? initialTeamRating(homePromoted);
    const awayRating = model.ratings.get(awayName) ?? initialTeamRating(awayPromoted);
    const pack = predictionPack({
      match,
      version: forecastRow.version,
      shared,
      homeRating,
      awayRating,
      homeAdvantage: model.homeAdvantage,
    });
    const evidencePackId = await persistPredictionEvidence(pack);
    for (const punditId of PUNDIT_IDS) {
      if (existingPundits.has(punditId)) {
        skipped += 1;
        continue;
      }
      const prediction = predictionClaim({
        punditId,
        match,
        shared,
        homeRating,
        awayRating,
        homeAdvantage: model.homeAdvantage,
      });
      const claim = prediction.claim;
      await serviceRest<null>("analysis_claims?on_conflict=id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: {
          id: claim.id,
          evidence_pack_id: evidencePackId,
          match_id: match.id,
          pundit_id: punditId,
          type: claim.type,
          thesis: claim.thesis,
          evidence_refs: claim.evidenceRefs,
          confidence: claim.confidence,
          alternative_explanation: claim.alternativeExplanation,
          missing_evidence: [],
          falsifier: claim.falsifier,
          evaluation_rule: claim.evaluationRule,
          status: "licensed",
        },
      });
      const draft: PredictionDraft = {
        punditId,
        matchId: match.id,
        kickoffAt: match.kickoff_at,
        shared,
        pundit: prediction.punditProbabilities,
        thesis: claim.thesis,
        measurableAdvantage: prediction.measurableAdvantage,
        indicator: prediction.indicator,
        expectedTurningPoint: prediction.expectedTurningPoint,
        evidenceRefs: claim.evidenceRefs,
        falsifier: claim.falsifier!,
        settlementRule: claim.evaluationRule!,
      };
      await registerPrediction({ draft, evidencePack: pack, now });
      registered += 1;
    }
  }
  return {
    ...sync,
    modelVersion: forecastRow.version,
    matches: matches.length,
    registered,
    skipped,
  };
}
