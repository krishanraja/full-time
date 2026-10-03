import { describe, expect, it } from "vitest";
import {
  convergentVariants,
  daysBetween,
  linesToAvoid,
  recencyWeight,
  repeatedLines,
  selfRepetitionScore,
  type PastLine,
} from "./self-originality";
import { publishedLines } from "./self-originality.server";

const TODAY = "2026-09-21";

const line = "The scoreline flattered them and the second half never really happened at all";
const nearlyTheSameLine =
  "The scoreline flattered them and the second half never really happened at any point";
const differentLine = "Two substitutions changed the shape of it and nobody saw them coming";

const past = (coverageDate: string, punditId = "doomer", text = line): PastLine => ({
  punditId,
  coverageDate,
  line: text,
});

describe("how much a repeat costs by how recently it happened", () => {
  it("counts a line from this week in full and one from last month not at all", () => {
    expect(recencyWeight(0)).toBe(1);
    expect(recencyWeight(3)).toBe(1);
    expect(recencyWeight(4)).toBe(0.4);
    expect(recencyWeight(14)).toBe(0.4);
    expect(recencyWeight(15)).toBe(0);
  });

  it("measures whole days between two coverage dates", () => {
    expect(daysBetween("2026-09-18", TODAY)).toBe(3);
    expect(daysBetween("2026-09-21", TODAY)).toBe(0);
  });
});

describe("a pundit repeating itself", () => {
  it("finds a line this pundit used three days ago", () => {
    const hits = repeatedLines("doomer", nearlyTheSameLine, [past("2026-09-18")], TODAY);
    expect(hits).toHaveLength(1);
    expect(hits[0].daysAgo).toBe(3);
    expect(hits[0].weight).toBeGreaterThan(0);
  });

  /** A persona is supposed to sound like itself. Past a fortnight, a recurring
   *  habit is the point of having one. */
  it("lets the same line go once it is old enough to be a habit", () => {
    expect(repeatedLines("doomer", nearlyTheSameLine, [past("2026-08-01")], TODAY)).toEqual([]);
  });

  it("says nothing about a line that is merely on the same subject", () => {
    expect(repeatedLines("doomer", differentLine, [past("2026-09-20")], TODAY)).toEqual([]);
  });

  /** Two personas reaching a similar phrase on the same evidence is a
   *  different problem with a different fix, and conflating them would punish
   *  a persona for having a voice. */
  it("does not hold one pundit responsible for another pundit's line", () => {
    expect(
      repeatedLines("doomer", nearlyTheSameLine, [past("2026-09-20", "romantic")], TODAY),
    ).toEqual([]);
  });

  it("puts the most recent lines in front of the writer, newest first", () => {
    const lines = linesToAvoid(
      "doomer",
      [past("2026-09-10", "doomer", differentLine), past("2026-09-20")],
      TODAY,
    );
    expect(lines).toEqual([line, differentLine]);
  });

  it("offers nothing to avoid when the pundit has published nothing recently", () => {
    expect(linesToAvoid("doomer", [past("2026-01-01")], TODAY)).toEqual([]);
  });

  /** The score never reaches zero between two English sentences:
   *  sourceSimilarity takes the longest contiguous run of shared words over
   *  sixteen, and one shared word is already 0.0625. What matters is the gap
   *  between a repeat and a coincidence, not the floor. */
  it("scores a script against everything the pundit said recently", () => {
    const repeat = selfRepetitionScore("doomer", nearlyTheSameLine, [past("2026-09-20")], TODAY);
    const unrelated = selfRepetitionScore("doomer", differentLine, [past("2026-09-20")], TODAY);
    expect(repeat).toBeGreaterThan(0.5);
    expect(unrelated).toBeLessThan(0.2);
    expect(repeat).toBeGreaterThan(unrelated * 4);
  });

  it("scores nothing when the pundit has published nothing recently", () => {
    expect(selfRepetitionScore("doomer", nearlyTheSameLine, [past("2026-01-01")], TODAY)).toBe(0);
  });
});

/** Six pundits share one evidence pack and one claim set and have never been
 *  compared to each other. On 2026-09-04 the claim laboratory returned
 *  thirty-five claims holding about ten ideas, all six built the same argument
 *  and five were failed for a truism. Nothing measured it. */
describe("six pundits writing the same show", () => {
  it("names the pair that converged", () => {
    const echoes = convergentVariants([
      { punditId: "doomer", text: line },
      { punditId: "romantic", text: nearlyTheSameLine },
      { punditId: "stats", text: differentLine },
    ]);
    expect(echoes).toHaveLength(1);
    expect([echoes[0].left, echoes[0].right].sort()).toEqual(["doomer", "romantic"]);
  });

  it("stays quiet when six pundits wrote six different shows", () => {
    expect(
      convergentVariants([
        { punditId: "doomer", text: line },
        { punditId: "stats", text: differentLine },
      ]),
    ).toEqual([]);
  });

  it("reports the worst convergence first", () => {
    const echoes = convergentVariants([
      { punditId: "a", text: line },
      { punditId: "b", text: nearlyTheSameLine },
      { punditId: "c", text: line },
    ]);
    expect(echoes[0].similarity).toBeGreaterThanOrEqual(echoes[echoes.length - 1].similarity);
  });
});

/** The loader turns published rows into comparable lines. It is separated from
 *  the query so the shaping is provable without a database. */
describe("reading lines out of published scripts", () => {
  const row = (punditId: string, portable: string, hook = "A hook long enough to count here") => ({
    pundit_id: punditId,
    beat_outline: { portable_line: portable, hook, judgment: "Carries the argument." },
    daily_drops: { coverage_date: "2026-09-19" },
  });

  it("takes the portable line and the hook, and leaves the argument alone", () => {
    const lines = publishedLines([row("doomer", "A portable line worth repeating twice")]);
    expect(lines.map((entry) => entry.line)).toEqual([
      "A portable line worth repeating twice",
      "A hook long enough to count here",
    ]);
    expect(lines.every((entry) => entry.punditId === "doomer")).toBe(true);
    expect(lines.every((entry) => entry.coverageDate === "2026-09-19")).toBe(true);
  });

  /** Below five words sourceSimilarity returns zero, so a shorter line is
   *  weight the caller would carry for nothing. */
  it("drops a line too short to be compared", () => {
    expect(publishedLines([row("doomer", "Too short", "Also short")])).toEqual([]);
  });

  it("copes with a drop embedded as an array, which PostgREST sometimes does", () => {
    const lines = publishedLines([
      {
        ...row("stats", "A portable line worth repeating twice"),
        daily_drops: [{ coverage_date: "2026-09-19" }],
      },
    ]);
    expect(lines[0]?.coverageDate).toBe("2026-09-19");
  });

  it("skips a row with no drop date rather than guessing one", () => {
    expect(
      publishedLines([
        { ...row("stats", "A portable line worth repeating twice"), daily_drops: null },
      ]),
    ).toEqual([]);
  });
});
