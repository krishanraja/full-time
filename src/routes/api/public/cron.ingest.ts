// Daily INGEST cron. Runs at 00:15 UTC, hours before the drop, so that every
// fact the recap needs is already in Postgres when generation starts.
//
// RULE 3 of the implementation plan: enrichment is materialised at ingest time,
// never fetched inside the generation cron. This route is the only place
// API-Football is called.
//
// The `_ops/ingest-daily.mjs` script is the same logic for local/manual runs.
// This route is what actually keeps the product alive day to day, because a
// pipeline that depends on someone running a script on a laptop is not a
// pipeline.

import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";
import { currentCoverageDate } from "@/lib/london-date";
import { hasStat, statLabels, statNumber as statN } from "@/lib/api/provider-stats";
import type { Database } from "@/integrations/supabase/types";

const AF = "https://v3.football.api-sports.io";
const PACE_MS = 300; // Pro: 300 req/min. The old 7000 was tuned for the free tier.
const TOP_N = 12;

/** The statistics we keep, as the column suffix and the provider's label for
 *  it. Pairing them here means a missing field can be named, rather than only
 *  arriving as a null. */
const STAT_FIELDS = [
  ["xg", "expected_goals"],
  ["possession", "Ball Possession"],
  ["shots", "Total Shots"],
  ["sot", "Shots on Goal"],
  ["corners", "Corner Kicks"],
  ["blocked", "Blocked Shots"],
  ["saves", "Goalkeeper Saves"],
  ["fouls", "Fouls"],
  ["offsides", "Offsides"],
] as const;

const LEAGUES = [
  { afId: 39, id: "af_39", name: "Premier League", country: "England", fd: "PL" },
  { afId: 140, id: "af_140", name: "La Liga", country: "Spain", fd: "PD" },
  { afId: 135, id: "af_135", name: "Serie A", country: "Italy", fd: "SA" },
  { afId: 78, id: "af_78", name: "Bundesliga", country: "Germany", fd: "BL1" },
  { afId: 61, id: "af_61", name: "Ligue 1", country: "France", fd: "FL1" },
];

/** Untyped API-Football payload. The provider's response shape is wide, varies
 *  by endpoint and is not worth mirroring: everything that reaches Postgres is
 *  narrowed into the typed row shapes below before it is written. */
type Json = Record<string, unknown> & {
  [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type TeamRow = {
  id: string;
  name: string;
  short: string;
  league_id: string;
  crest_url: string | null;
};
type PlayerRow = { id: string; name: string; team_id: string | null };
type EventRow = {
  match_id: string;
  minute: number | null;
  added_time: number | null;
  type: string;
  team_id: string | null;
  player_id: string | null;
  player_name: string | null;
  assist_player_id: string | null;
  detail: string | null;
  source: string;
};
type MatchStatsInsert = Database["public"]["Tables"]["match_stats"]["Insert"];

type ContextRow = {
  match_id: string;
  matchday: number | null;
  home_gk_name: string | null;
  away_gk_name: string | null;
  home_gk_subbed: boolean;
  away_gk_subbed: boolean;
  feeds_agree: boolean | null;
  crosscheck_src: string | null;
  source: string;
  updated_at: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Yesterday in UK time: the drop recaps the day that just finished. */
function yesterdayUK(): string {
  return currentCoverageDate();
}

const evType = (e: Json): string | null => {
  if (e.type === "Goal") {
    const d = e.detail || "";
    if (/Own/i.test(d)) return "own_goal";
    if (/Missed/i.test(d)) return "penalty_miss";
    if (/Penalty/i.test(d)) return "penalty_goal";
    return "goal";
  }
  if (e.type === "Card") {
    const d = e.detail || "";
    if (/Second/i.test(d)) return "second_yellow";
    if (/Red/i.test(d)) return "red";
    return "yellow";
  }
  if (e.type === "subst") return "sub";
  if (e.type === "Var") return "var";
  return null;
};

// Cross-feed team matching. Conservative by design: an unmatched fixture leaves
// feeds_agree NULL (unknown), never false, because false BLOCKS generation.
const STOP = new Set([
  "fc",
  "cf",
  "afc",
  "ac",
  "as",
  "ss",
  "ssc",
  "sc",
  "sv",
  "sd",
  "ud",
  "cd",
  "rcd",
  "rc",
  "club",
  "calcio",
  "de",
  "di",
  "the",
  "and",
  "1899",
  "1900",
  "04",
  "05",
  "96",
  "1846",
]);
const tokens = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
function sameTeam(a: string, b: string): boolean {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.length || !B.length) return false;
  const overlap = A.filter((t) => B.includes(t)).length;
  if (overlap >= Math.min(A.length, B.length)) return true;
  return overlap >= 1 && (A.length === 1 || B.length === 1 || overlap >= 2);
}

async function handleIngest({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const started = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  console.log(JSON.stringify({ level: "info", message: "ingest_started", requestId }));

  const AF_KEY = process.env.API_FOOTBALL_KEY;
  if (!AF_KEY) return Response.json({ error: "API_FOOTBALL_KEY missing" }, { status: 500 });
  const FD_KEY = process.env.FOOTBALL_DATA_KEY ?? "";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const url = new URL(request.url);
  const SEASON = Number(url.searchParams.get("season") ?? process.env.FT_SEASON ?? 2026);
  const DATE = url.searchParams.get("date") ?? yesterdayUK();
  const skipCoverage = url.searchParams.get("skipCoverage") === "1";

  let calls = 0;
  const af = async (path: string, retries = 2): Promise<Json[]> => {
    await sleep(PACE_MS);
    calls++;
    const r = await fetch(AF + path, {
      headers: { "x-apisports-key": AF_KEY },
      signal: AbortSignal.timeout(30_000),
    });
    const d = (await r.json()) as Json;
    if (d.errors?.rateLimit && retries > 0) {
      await sleep(25_000);
      return af(path, retries - 1);
    }
    if (d.errors && Object.keys(d.errors).length) {
      console.error("[ingest] AF error", path, JSON.stringify(d.errors));
      return [];
    }
    return d.response ?? [];
  };

  const warnings: string[] = [];
  let absentStatsReported = false;

  // ---- coverage preflight. RISK 1 and the single highest-probability
  // launch-day failure: if events coverage is off, events come back empty,
  // the score check fails on every match, and the whole day drops silently.
  const live: typeof LEAGUES = [];
  for (const lg of LEAGUES) {
    if (skipCoverage) {
      live.push(lg);
      continue;
    }
    const res = await af(`/leagues?id=${lg.afId}`);
    const season = (res[0]?.seasons ?? []).find((s: Json) => Number(s.year) === SEASON);
    if (season?.coverage?.fixtures?.events === true) live.push(lg);
    else warnings.push(`${lg.name}: event coverage is NOT live for season ${SEASON}`);
  }
  if (!live.length) {
    console.error("[ingest] ABORT: no league has live event coverage", warnings);
    return Response.json(
      {
        ok: false,
        aborted: "no league has live event coverage",
        date: DATE,
        season: SEASON,
        warnings,
      },
      { status: 503 },
    );
  }

  // ---- fixtures
  const all: Array<{ lg: (typeof LEAGUES)[number]; f: Json }> = [];
  for (const lg of live) {
    const fixtures = await af(`/fixtures?league=${lg.afId}&season=${SEASON}&date=${DATE}`);
    for (const f of fixtures.filter((x: Json) => x.fixture?.status?.short === "FT")) {
      all.push({ lg, f });
    }
  }
  if (!all.length) {
    return Response.json({
      ok: true,
      date: DATE,
      season: SEASON,
      finished: 0,
      calls,
      warnings,
    });
  }

  const importanceOf = (f: Json) => {
    const total = (f.goals.home ?? 0) + (f.goals.away ?? 0);
    const margin = Math.abs((f.goals.home ?? 0) - (f.goals.away ?? 0));
    return total + (margin <= 1 ? 2 : 0) + (total >= 4 ? 2 : 0);
  };
  const short = (n: string) =>
    n
      .replace(/[^A-Za-z ]/g, "")
      .trim()
      .slice(0, 3)
      .toUpperCase() || "CLB";

  // ---- leagues, teams, matches
  await supabaseAdmin.from("leagues").upsert(
    live.map((l) => ({ id: l.id, name: l.name, country: l.country })),
    { onConflict: "id" },
  );

  const teams = new Map<string, TeamRow>();
  for (const { lg, f } of all) {
    for (const t of [f.teams.home, f.teams.away]) {
      if (t?.id && !teams.has(`af_${t.id}`)) {
        teams.set(`af_${t.id}`, {
          id: `af_${t.id}`,
          name: t.name,
          short: short(t.name),
          league_id: lg.id,
          crest_url: t.logo,
        });
      }
    }
  }
  await supabaseAdmin.from("teams").upsert([...teams.values()], { onConflict: "id" });
  await supabaseAdmin.from("matches").upsert(
    all.map(({ lg, f }) => ({
      id: `af_${f.fixture.id}`,
      league_id: lg.id,
      home_team_id: `af_${f.teams.home.id}`,
      away_team_id: `af_${f.teams.away.id}`,
      home_score: f.goals.home,
      away_score: f.goals.away,
      kickoff_at: f.fixture.date,
      status: "finished",
      importance_score: importanceOf(f),
    })),
    { onConflict: "id" },
  );
  const matchIds = all.map(({ f }) => `af_${f.fixture.id}`);
  if (matchIds.length) {
    const { serviceRest } = await import("@/lib/pundit/service-rest.server");
    await serviceRest<null>(`matches?id=in.(${matchIds.join(",")})`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { season: SEASON },
    });
  }

  // ---- rich fetch for the top N by importance
  const ranked = [...all].sort((a, b) => importanceOf(b.f) - importanceOf(a.f)).slice(0, TOP_N);
  const contexts: ContextRow[] = [];

  for (const { lg, f } of ranked) {
    const mid = `af_${f.fixture.id}`;
    const [evs, st, lineups] = [
      await af(`/fixtures/events?fixture=${f.fixture.id}`),
      await af(`/fixtures/statistics?fixture=${f.fixture.id}`),
      await af(`/fixtures/lineups?fixture=${f.fixture.id}`),
    ];

    const players = new Map<string, PlayerRow>();
    const events: EventRow[] = [];
    for (const e of evs) {
      const ty = evType(e);
      if (!ty) continue;
      for (const p of [e.player, e.assist]) {
        if (p?.id) {
          players.set(`af_${p.id}`, {
            id: `af_${p.id}`,
            name: p.name,
            team_id: e.team?.id ? `af_${e.team.id}` : null,
          });
        }
      }
      // API-Football INVERTS player/assist on substitutions: `player` is
      // the man going OFF, `assist` the man coming ON. Verified against
      // /fixtures/lineups on fixture 1379261. Normalised so player_* is
      // the ENTRANT, matching every other event type. Without this the
      // SUB_IMPACT angle names the wrong man and no gate can catch it.
      // DO NOT "fix" this back.
      const actor = ty === "sub" ? e.assist : e.player;
      const counterpart = ty === "sub" ? e.player : e.assist;
      events.push({
        match_id: mid,
        minute: e.time?.elapsed ?? null,
        added_time: e.time?.extra ?? null,
        type: ty,
        team_id: e.team?.id ? `af_${e.team.id}` : null,
        player_id: actor?.id ? `af_${actor.id}` : null,
        player_name: actor?.name ?? null,
        assist_player_id: counterpart?.id ? `af_${counterpart.id}` : null,
        detail: ty === "sub" ? `off:${e.player?.name ?? ""}` : (e.detail ?? null),
        source: "api-football",
      });
    }

    if (players.size) {
      await supabaseAdmin.from("players").upsert([...players.values()], { onConflict: "id" });
    }
    if (events.length) {
      await supabaseAdmin.from("match_events").delete().eq("match_id", mid);
      await supabaseAdmin.from("match_events").insert(events);
    }

    const byTeam = (id: number) => (st.find((x: Json) => x.team?.id === id) ?? {}).statistics ?? [];
    const h = byTeam(f.teams.home.id);
    const a = byTeam(f.teams.away.id);
    if (st.length) {
      // A field the provider has stopped sending must not erase the value we
      // already hold. Expected goals arrived for every match to 31 August and
      // for none after it, so re-ingesting an August fixture today would write
      // null over a figure the provider itself gave us, and the loss would be
      // silent and permanent. A statistic the provider omits is left alone.
      const row: MatchStatsInsert = { match_id: mid, source: "api-football" };
      for (const [column, label] of STAT_FIELDS) {
        const home = statN(h, label);
        const away = statN(a, label);
        if (home !== null) row[`home_${column}`] = home;
        if (away !== null) row[`away_${column}`] = away;
      }
      await supabaseAdmin.from("match_stats").upsert(row, { onConflict: "match_id" });

      // A provider that stops sending a field empties a column in silence.
      // Expected goals arrived for every match up to 31 August 2026 and for
      // none after it, while every other statistic kept coming, and nothing
      // raised for five days. Absence is now reported with the labels the
      // provider did send, so a rename and a withdrawal are told apart at the
      // point where the difference is visible. Reported once per run, because
      // a missing field is missing for every fixture that day.
      const absent = STAT_FIELDS.filter(
        ([, label]) => !hasStat(h, label) && !hasStat(a, label),
      ).map(([, label]) => label);
      if (absent.length && !absentStatsReported) {
        absentStatsReported = true;
        const msg = `Statistics absent from the provider for ${mid}: ${absent.join(", ")}. It sent: ${statLabels(h).join(", ") || "nothing"}.`;
        console.error("[ingest] " + msg);
        warnings.push(msg);
      }
    }

    // Starting keepers, for the KEEPER angle, which is only safe when the
    // keeper played the whole match.
    const gkOf = (id: number) => {
      const l = lineups.find((x: Json) => x.team?.id === id);
      const gk = (l?.startXI ?? []).map((s: Json) => s.player).find((p: Json) => p?.pos === "G");
      return gk ? { id: `af_${gk.id}`, name: gk.name } : null;
    };
    const hGk = gkOf(f.teams.home.id);
    const aGk = gkOf(f.teams.away.id);
    const subbed = (gk: { id: string } | null) =>
      !!gk && events.some((e) => e.type === "sub" && e.assist_player_id === gk.id);

    contexts.push({
      match_id: mid,
      matchday: Number(String(f.league?.round ?? "").match(/(\d+)\s*$/)?.[1]) || null,
      home_gk_name: hGk?.name ?? null,
      away_gk_name: aGk?.name ?? null,
      home_gk_subbed: subbed(hGk),
      away_gk_subbed: subbed(aGk),
      feeds_agree: null,
      crosscheck_src: null,
      source: "api-football",
      updated_at: new Date().toISOString(),
    });
  }

  // ---- h2h cache: one call per pairing per season, the only
  // history-bearing angle available on matchday 1.
  const { data: cachedRows } = await supabaseAdmin
    .from("h2h_cache")
    .select("league_id, team_a_id, team_b_id")
    .eq("season", SEASON);
  const cached = new Set(
    (cachedRows ?? []).map((r) => `${r.league_id}|${r.team_a_id}|${r.team_b_id}`),
  );
  for (const { lg, f } of ranked) {
    const [x, y] = [`af_${f.teams.home.id}`, `af_${f.teams.away.id}`].sort();
    if (cached.has(`${lg.id}|${x}|${y}`)) continue;
    const res = await af(`/fixtures/headtohead?h2h=${f.teams.home.id}-${f.teams.away.id}&last=10`);
    const meetings = res
      .filter((r: Json) => r.fixture?.status?.short === "FT")
      .filter((r: Json) => r.league?.id === f.league?.id) // never mix cups in
      .filter((r: Json) => r.fixture.id !== f.fixture.id)
      .sort((p: Json, r: Json) => +new Date(r.fixture.date) - +new Date(p.fixture.date))
      .map((r: Json) => ({
        date: r.fixture.date,
        home_id: `af_${r.teams.home.id}`,
        away_id: `af_${r.teams.away.id}`,
        home_goals: r.goals.home,
        away_goals: r.goals.away,
      }));
    await supabaseAdmin
      .from("h2h_cache")
      .upsert(
        { league_id: lg.id, season: SEASON, team_a_id: x, team_b_id: y, meetings },
        { onConflict: "league_id,season,team_a_id,team_b_id" },
      );
    cached.add(`${lg.id}|${x}|${y}`);
  }

  // ---- score cross-check. football-data.org free tier is SCORES ONLY, so
  // it is used for exactly one thing: proving the scoreline independently.
  let agreed = 0;
  let disagreed = 0;
  let unmatched = 0;
  if (FD_KEY) {
    for (const lg of live) {
      const mine = ranked.filter((r) => r.lg.afId === lg.afId);
      if (!mine.length) continue;
      let fdList: Json[] | null = null;
      try {
        const r = await fetch(
          `https://api.football-data.org/v4/competitions/${lg.fd}/matches?dateFrom=${DATE}&dateTo=${DATE}`,
          {
            headers: { "X-Auth-Token": FD_KEY },
            signal: AbortSignal.timeout(30_000),
          },
        );
        if (r.ok)
          fdList =
            ((await r.json()) as Json).matches?.filter((m: Json) => m.status === "FINISHED") ?? [];
      } catch {
        fdList = null;
      }
      if (!fdList) {
        unmatched += mine.length;
        continue;
      }
      for (const { f } of mine) {
        const ctx = contexts.find((c) => c.match_id === `af_${f.fixture.id}`);
        if (!ctx) continue;
        const hit = fdList.find(
          (x) =>
            sameTeam(x.homeTeam?.name ?? x.homeTeam?.shortName, f.teams.home.name) &&
            sameTeam(x.awayTeam?.name ?? x.awayTeam?.shortName, f.teams.away.name),
        );
        if (!hit) {
          unmatched++;
          continue;
        }
        ctx.crosscheck_src = "football-data.org";
        const ok =
          hit.score?.fullTime?.home === f.goals.home && hit.score?.fullTime?.away === f.goals.away;
        ctx.feeds_agree = ok;
        if (ok) agreed++;
        else {
          disagreed++;
          const msg = `CROSS-CHECK DISAGREEMENT ${f.teams.home.name} v ${f.teams.away.name}: api-football ${f.goals.home}-${f.goals.away}, football-data ${hit.score?.fullTime?.home}-${hit.score?.fullTime?.away}. This match will NOT be generated.`;
          console.error("[ingest] " + msg);
          warnings.push(msg);
        }
      }
    }
  }

  if (contexts.length) {
    await supabaseAdmin.from("match_context").upsert(contexts, { onConflict: "match_id" });
  }

  let predictionSettlement: { settled: number; unjudgeable: number; matches: number } | null = null;
  try {
    const { settleOpenPredictionsForMatches } =
      await import("@/lib/pundit/prediction-settlement.server");
    predictionSettlement = await settleOpenPredictionsForMatches(
      ranked.map(({ f }) => `af_${f.fixture.id}`),
    );
  } catch (error: unknown) {
    warnings.push(
      `Prediction settlement unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const response = {
    ok: true,
    date: DATE,
    season: SEASON,
    finished: all.length,
    enriched: ranked.length,
    crosscheck: { agreed, disagreed, unmatched },
    predictionSettlement,
    calls,
    warnings,
  };
  console.log(
    JSON.stringify({
      level: "info",
      message: "ingest_completed",
      requestId,
      date: DATE,
      finished: all.length,
      enriched: ranked.length,
      calls,
      warnings: warnings.length,
      durationMs: Date.now() - started,
    }),
  );
  return Response.json(response);
}

export const Route = createFileRoute("/api/public/cron/ingest")({
  server: {
    handlers: {
      GET: handleIngest,
      POST: handleIngest,
    },
  },
});
