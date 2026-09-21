/** FotMob, for a second expected-goals model.
 *
 *  Verified against the live endpoints on 2026-09-21. Two calls: a day's
 *  fixtures, then one match's details.
 *
 *    /api/data/matches?date=YYYYMMDD
 *    /api/data/matchDetails?matchId=<id>
 *
 *  The paths matter because the obvious ones are wrong. /api/matches and
 *  /api/leagues both answer 200 with an HTML application shell, which parses
 *  as neither JSON nor an error, so a reader that trusts the status code gets
 *  a page of markup where it expected a fixture list. Only the /api/data/
 *  prefix returns JSON.
 *
 *  Statistics live at content.stats.Periods.All.stats[], a list of groups each
 *  holding rows keyed by a stable string with a two-element [home, away]
 *  array. Rows are read by that key and never by their display title or their
 *  position, for the reason written on provider-stats.ts: matching one oddly
 *  named field exactly is the shape of failure that silently emptied expected
 *  goals for five days.
 *
 *  Nothing here throws. */

import type { SourceAdapter, SourceMatchStats } from "./types";

const BASE = "https://www.fotmob.com/api/data";

/** Recorded rather than paraphrased, so nobody has to go and look it up again
 *  to know where this stands. */
export const FOTMOB_RIGHTS = {
  basis: "unlicensed",
  restriction:
    "Free to access and not licensed for reuse. No permission was sought or granted for automated collection or commercial use. Ingested by founder ruling on 2026-09-21 with the rights exposure accepted and the data-rights sign-off left open.",
  attribution: "FotMob",
} as const;

type StatRow = { key?: unknown; stats?: unknown };
type StatGroup = { stats?: StatRow[] };

/** A number from a [home, away] pair, or null.
 *
 *  Values arrive as numbers for counts and as strings for anything with a
 *  decimal, and a percentage rides along in the same string as the count
 *  ("298 (78%)"). Only a clean number is taken; a compound is left alone
 *  rather than guessed at. */
export function pairValue(rows: readonly StatGroup[], key: string): [number | null, number | null] {
  for (const group of rows ?? []) {
    for (const row of group?.stats ?? []) {
      if (row?.key !== key || !Array.isArray(row.stats)) continue;
      const read = (value: unknown): number | null => {
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const [home, away] = row.stats as unknown[];
      // A title row carries [null, null] and must not end the search: the same
      // key appears as a heading and again as the value beneath it.
      const pair: [number | null, number | null] = [read(home), read(away)];
      if (pair[0] !== null || pair[1] !== null) return pair;
    }
  }
  return [null, null];
}

type MatchDetails = {
  general?: {
    homeTeam?: { name?: unknown };
    awayTeam?: { name?: unknown };
    matchTimeUTCDate?: unknown;
  };
  content?: { stats?: { Periods?: { All?: { stats?: StatGroup[] } } } };
};

export function parseMatchDetails(payload: MatchDetails): SourceMatchStats | null {
  const home = payload?.general?.homeTeam?.name;
  const away = payload?.general?.awayTeam?.name;
  if (typeof home !== "string" || typeof away !== "string") return null;
  const groups = payload?.content?.stats?.Periods?.All?.stats ?? [];
  const [homeXg, awayXg] = pairValue(groups, "expected_goals");
  const [homeOpen, awayOpen] = pairValue(groups, "expected_goals_open_play");
  return {
    sourceId: "fotmob",
    model: "FotMob expected goals",
    homeTeam: home,
    awayTeam: away,
    kickoffAt:
      typeof payload.general?.matchTimeUTCDate === "string"
        ? payload.general.matchTimeUTCDate
        : undefined,
    homeXg,
    awayXg,
    homeXgOpenPlay: homeOpen,
    awayXgOpenPlay: awayOpen,
  };
}

type DayFixture = {
  id?: unknown;
  home?: { name?: unknown; longName?: unknown };
  away?: { name?: unknown; longName?: unknown };
};

/** Their name for a club and ours are rarely the same string. "AFC
 *  Bournemouth" against "Bournemouth", "Man United" against "Manchester
 *  United", "Brighton & Hove Albion" against "Brighton and Hove Albion".
 *
 *  Every token of the shorter name has to be a prefix of a distinct token of
 *  the longer one. Plain containment is not enough - "manunited" does not
 *  contain and is not contained by "manchesterunited" - and anything looser
 *  starts matching clubs to each other, which would attribute one match's
 *  numbers to a different match. That is a worse outcome than missing the
 *  fixture, so the rule stays strict and the caller also requires the match to
 *  be unique.
 *
 *  "Man City" against "Manchester United" fails on "city", which is the case
 *  that decides whether this rule is safe. */
export function sameClub(left: string, right: string): boolean {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter((token) => token && token !== "and" && token !== "fc" && token !== "afc");
  const a = tokens(left);
  const b = tokens(right);
  if (!a.length || !b.length) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const remaining = [...longer];
  return shorter.every((token) => {
    const index = remaining.findIndex(
      (other) => other.startsWith(token) || token.startsWith(other),
    );
    if (index === -1) return false;
    remaining.splice(index, 1);
    return true;
  });
}

/** The one fixture in a day that is this fixture.
 *
 *  A day's payload holds a hundred and fifty leagues, and the same two club
 *  names can appear in a domestic game and a cup tie. Two matches is not a
 *  near miss, it is a coin toss between two different results, so an ambiguous
 *  day yields nothing. */
export function findFixtureId(
  payload: { leagues?: Array<{ matches?: DayFixture[] }> },
  homeTeam: string,
  awayTeam: string,
): number | null {
  const found: number[] = [];
  for (const league of payload?.leagues ?? []) {
    for (const match of league?.matches ?? []) {
      const home = String(match?.home?.longName ?? match?.home?.name ?? "");
      const away = String(match?.away?.longName ?? match?.away?.name ?? "");
      if (typeof match.id !== "number") continue;
      if (sameClub(home, homeTeam) && sameClub(away, awayTeam)) found.push(match.id);
    }
  }
  const unique = [...new Set(found)];
  return unique.length === 1 ? unique[0] : null;
}

async function readJson(url: string, fetchImpl: typeof fetch): Promise<unknown | null> {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;
  const body = await response.text();
  // The application shell answers 200 with HTML. Without this a page of markup
  // reaches JSON.parse and throws from inside a source that must not throw.
  if (!body.trimStart().startsWith("{")) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function fotmobAdapter(fetchImpl: typeof fetch = fetch): SourceAdapter {
  return {
    id: "fotmob",
    rights: FOTMOB_RIGHTS,
    async fetchMatchStats({ homeTeam, awayTeam, date }) {
      try {
        const day = date.slice(0, 10).replace(/-/g, "");
        const fixtures = (await readJson(`${BASE}/matches?date=${day}`, fetchImpl)) as {
          leagues?: Array<{ matches?: DayFixture[] }>;
        } | null;
        if (!fixtures) return null;
        const id = findFixtureId(fixtures, homeTeam, awayTeam);
        if (id == null) return null;
        const details = (await readJson(
          `${BASE}/matchDetails?matchId=${id}`,
          fetchImpl,
        )) as MatchDetails | null;
        return details ? parseMatchDetails(details) : null;
      } catch (error: unknown) {
        console.error(
          "[fotmob] unavailable:",
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    },
  };
}
