/** Which match the day's show is about.
 *
 *  The ranking has been goals and nothing else since it was written:
 *  total + 2 if the margin is one or less + 2 if there were four or more. That
 *  is a decent proxy for entertainment and a poor one for significance. A
 *  four-three between two mid-table sides outranks a one-nil between the top
 *  two, every time, and the second is the show.
 *
 *  This adds what a league table can say about why a match mattered, and
 *  nothing else. It cannot say a match was a relegation six-pointer, because
 *  that depends on matches remaining; it can say both sides were in the bottom
 *  six on the morning of the game, which is an observation rather than a
 *  forecast.
 *
 *  The goals term is untouched. A table that is missing, stale or empty leaves
 *  the ranking exactly as it was, because the ranking also decides which
 *  twelve fixtures get events, statistics and lineups at all - a standings
 *  outage must not quietly change which matches have data. */

export type TableRow = { rank: number | null; points: number | null };

/** The goals-only ranking, unchanged since it was written. */
export function goalImportance(homeGoals: number, awayGoals: number): number {
  const total = homeGoals + awayGoals;
  const margin = Math.abs(homeGoals - awayGoals);
  return total + (margin <= 1 ? 2 : 0) + (total >= 4 ? 2 : 0);
}

/** How much the table says this fixture mattered. Zero when it cannot say. */
export function tableStakes(
  home: TableRow | undefined,
  away: TableRow | undefined,
  /** How many clubs the snapshot holds, which is how "the bottom six" is
   *  defined without hard-coding a twenty-team league. */
  clubsInLeague: number,
): number {
  if (!home?.rank || !away?.rank || clubsInLeague < 6) return 0;
  const top = (rank: number) => rank <= 6;
  const bottom = (rank: number) => rank > clubsInLeague - 6;
  const contenders = top(home.rank) && top(away.rank);
  const strugglers = bottom(home.rank) && bottom(away.rank);
  // Rank proximity only means something at the ends of the table. Eleventh
  // against fourteenth is two clubs who happen to be adjacent, and counting
  // that as significance would hand the bonus to exactly the mid-table
  // fixtures this is meant to stop over-ranking.
  const neighbours =
    Math.abs(home.rank - away.rank) <= 3 &&
    (top(home.rank) || top(away.rank) || bottom(home.rank) || bottom(away.rank));

  // Capped at four. Significance informs the ranking; it does not overwhelm
  // it, because the goals term also decides which twelve fixtures are enriched
  // at all and a wholesale reweighting would change which matches have data.
  //
  // So this narrows the gap rather than reversing it. A one-nil between the
  // top two scores seven against eleven for a four-three in mid-table, where
  // before it was three against eleven. Making significance actually win would
  // mean rethinking the goals term, which is a larger change than this one.
  return Math.min(4, (contenders ? 3 : 0) + (strugglers ? 2 : 0) + (neighbours ? 2 : 0));
}

export function matchImportance(input: {
  homeGoals: number;
  awayGoals: number;
  home?: TableRow;
  away?: TableRow;
  clubsInLeague?: number;
}): number {
  return (
    goalImportance(input.homeGoals, input.awayGoals) +
    tableStakes(input.home, input.away, input.clubsInLeague ?? 0)
  );
}
