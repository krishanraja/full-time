import { describe, expect, it } from "vitest";
import { goalImportance, matchImportance, tableStakes } from "./match-importance";

const top = (rank: number) => ({ rank, points: 20 });

describe("the goals-only ranking, unchanged", () => {
  it("scores a tight high-scoring game above a comfortable one", () => {
    expect(goalImportance(4, 3)).toBeGreaterThan(goalImportance(4, 0));
  });
  it("scores a one-nil the way it always has", () => {
    expect(goalImportance(1, 0)).toBe(3);
  });
});

describe("what a league table can say about why a match mattered", () => {
  /** The case that motivated this. Under the goals-only ranking the 4-3
   *  between mid-table sides wins by five, and the show goes to the wrong
   *  match. */
  it("lifts a meeting between contenders above a mid-table goal fest", () => {
    const titleDecider = matchImportance({
      homeGoals: 1,
      awayGoals: 0,
      home: top(1),
      away: top(2),
      clubsInLeague: 20,
    });
    const goalFest = matchImportance({
      homeGoals: 4,
      awayGoals: 3,
      home: top(11),
      away: top(14),
      clubsInLeague: 20,
    });
    expect(titleDecider).toBe(7);
    // Mid-table adjacency is not significance, so the goal fest gets nothing.
    expect(goalFest).toBe(11);
    // It narrows the gap rather than reversing it, and that is the honest
    // claim: eight points became four. A seven-goal game is still a seven-goal
    // game, and making significance actually win would mean rethinking the
    // goals term - a change that would also move which fixtures get enriched.
    expect(goalFest - titleDecider).toBe(4);
  });

  it("counts two clubs near the bottom of the table", () => {
    expect(tableStakes(top(19), top(20), 20)).toBeGreaterThan(0);
  });

  it("counts two clubs who are direct neighbours at the top", () => {
    expect(tableStakes(top(5), top(7), 20)).toBe(2);
  });

  /** Eleventh against fourteenth is two clubs who happen to be adjacent.
   *  Counting that would hand the bonus to exactly the mid-table fixtures this
   *  exists to stop over-ranking. */
  it("does not count mid-table adjacency as significance", () => {
    expect(tableStakes(top(11), top(14), 20)).toBe(0);
  });

  it("caps what significance can add", () => {
    expect(tableStakes(top(1), top(2), 20)).toBe(4);
  });

  /** A standings outage must not quietly change which matches get events,
   *  statistics and lineups. The goals term has to survive on its own. */
  it("says nothing at all without a table", () => {
    expect(tableStakes(undefined, undefined, 0)).toBe(0);
    expect(tableStakes(top(1), undefined, 20)).toBe(0);
    expect(tableStakes({ rank: null, points: null }, top(2), 20)).toBe(0);
    expect(matchImportance({ homeGoals: 4, awayGoals: 3 })).toBe(goalImportance(4, 3));
  });

  it("says nothing about a league too small to have a bottom six", () => {
    expect(tableStakes(top(1), top(2), 4)).toBe(0);
  });
});
