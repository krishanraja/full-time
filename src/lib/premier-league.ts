/** Full Time covers the Premier League and nothing else.
 *
 *  Ruling (Krish, 2026-09-27): the product is for Premier League teams only.
 *  Before this, the ingest pulled five leagues, the daily pick ranked all of
 *  them by importance with no league filter, and Teams listed 120 clubs. The
 *  one show this product had published by 2026-09-05 was Barcelona v Rayo
 *  Vallecano, on a day a Premier League match was also played.
 *
 *  One constant, so the ingest, the daily pick, Teams and Today cannot drift
 *  apart again. Adding a league back is a change here, not a search. */
export const PREMIER_LEAGUE = {
  /** API-Football's league id. */
  providerId: 39,
  /** The stored `leagues.id`, which `teams.league_id` and `matches.league_id`
   *  reference. Not the `epl` seed from the first migration: nothing live uses
   *  it. Note the collision: team `af_39` is Wolves. Compare league ids only
   *  against league ids. */
  id: "af_39",
  name: "Premier League",
  country: "England",
  /** football-data.org's competition code. */
  footballDataCode: "PL",
} as const;

export const PREMIER_LEAGUE_ID = PREMIER_LEAGUE.id;

export function isPremierLeague(leagueId: string | null | undefined): boolean {
  return leagueId === PREMIER_LEAGUE_ID;
}

/** The provider's names are full club names. Three of them do not fit a
 *  phone-width grid or a scoreboard line, and fans do not say them anyway. */
const SHORT_CLUB_NAMES: Record<string, string> = {
  "Manchester City": "Man City",
  "Manchester United": "Man Utd",
  "Nottingham Forest": "Nott'm Forest",
  "Wolverhampton Wanderers": "Wolves",
  "Brighton & Hove Albion": "Brighton",
  "Tottenham Hotspur": "Tottenham",
  "West Ham United": "West Ham",
  "Newcastle United": "Newcastle",
  "Sheffield United": "Sheffield Utd",
};

export function clubDisplayName(name: string): string {
  const trimmed = name.trim();
  return SHORT_CLUB_NAMES[trimmed] ?? trimmed;
}

/** A club crest from the provider's public imagery (`teams.crest_url`,
 *  written by the ingest from API-Football's team logo).
 *
 *  Ruling (Krish, 2026-09-27): show club crests from the provider's public
 *  imagery, accepting the trademark exposure; docs/11-legal.md records it.
 *  Only an https URL is passed to an image tag. */
export function crestUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

type ClubRow = { id: string; name: string };
type SeasonMatchRow = { home_team_id: string; away_team_id: string };

/** The clubs in the current Premier League season.
 *
 *  `teams.league_id = af_39` is not enough: it returned 25 on 2026-09-27,
 *  because relegated clubs keep the league id they were first stored with.
 *  The current twenty are the clubs that appear in a match of the latest
 *  stored season. Pure, so it can be tested without a database. */
export function currentSeasonClubs<T extends ClubRow>(
  teams: readonly T[],
  seasonMatches: readonly SeasonMatchRow[],
): T[] {
  const playing = new Set(
    seasonMatches.flatMap((match) => [match.home_team_id, match.away_team_id]),
  );
  return teams
    .filter((team) => playing.has(team.id))
    .sort((a, b) => clubDisplayName(a.name).localeCompare(clubDisplayName(b.name), "en-GB"));
}

/** The Premier League has twenty clubs. A season with fewer stored is not
 *  finished loading, not smaller. */
export const PREMIER_LEAGUE_CLUBS = 20;

/** Which stored season's clubs to show when there is no standings snapshot.
 *
 *  Matches are stored one finished day at a time, so a new season holds two
 *  clubs after its Friday opener and all twenty only once every club has
 *  played: on 2026-08-22 this season held 10. The newest season is used
 *  once it holds all twenty; until then the previous one is, which is closer
 *  to right than a list with half the league missing. */
export function currentSeasonClubIds(
  seasonMatches: ReadonlyArray<SeasonMatchRow & { season: number | null }>,
): string[] {
  const bySeason = new Map<number, Set<string>>();
  for (const match of seasonMatches) {
    if (match.season == null) continue;
    const clubs = bySeason.get(match.season) ?? new Set<string>();
    clubs.add(match.home_team_id);
    clubs.add(match.away_team_id);
    bySeason.set(match.season, clubs);
  }
  const seasons = [...bySeason.entries()].sort((a, b) => b[0] - a[0]);
  const complete = seasons.find(([, clubs]) => clubs.size >= PREMIER_LEAGUE_CLUBS);
  const fullest = [...seasons].sort((a, b) => b[1].size - a[1].size)[0];
  return [...((complete ?? fullest)?.[1] ?? [])];
}
