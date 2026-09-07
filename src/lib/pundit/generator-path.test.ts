import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildEvidencePack, type StructuredMatchInput } from "./evidence";
import { generateClaimLaboratory, generatePunditVariant } from "./pundit-generator.server";
import { REQUIRED_HARNESS_NAMES } from "./promise-checks.server";
import { PUNDIT_IDS } from "./types";

/** The writing and judging path, driven end to end on stub responses.
 *
 *  Three of the last four paid runs died on structural faults rather than on
 *  editorial ones: a durable run replaying stale steps, a database constraint
 *  capping attempts, and a judge answering with a list of spans where the
 *  schema wanted a string. That last one was introduced by a prompt change and
 *  found by paying for six scripts and losing all of them.
 *
 *  Every one of those was reachable without a model. This test walks the same
 *  path the workflow walks - claim laboratory, writer, eleven deterministic
 *  gates, two hard judges, twelve qualitative judges, the repair loop and the
 *  result shape - for every one of the six pundits, and costs nothing. It says
 *  nothing about whether the writing is good; that is what the real models are
 *  for. It says the path holds. */

const ipswichLiverpool: StructuredMatchInput = {
  match: {
    id: "match-il",
    homeTeam: "Ipswich",
    awayTeam: "Liverpool",
    homeScore: 0,
    awayScore: 2,
    kickoffAt: "2026-09-04T19:00:00Z",
    competition: "Premier League",
    source: "provider-a",
  },
  events: [
    {
      id: "goal-isak",
      type: "goal",
      minute: 4,
      team: "Liverpool",
      player: "Alexander Isak",
      source: "provider-a",
    },
    {
      id: "goal-salah",
      type: "goal",
      minute: 9,
      team: "Liverpool",
      player: "Mohamed Salah",
      source: "provider-a",
    },
    {
      id: "card-mac",
      type: "yellow",
      minute: 10,
      team: "Liverpool",
      player: "Alexis Mac Allister",
      source: "provider-a",
    },
    {
      id: "sub-jones",
      type: "sub",
      minute: 68,
      team: "Liverpool",
      player: "Curtis Jones",
      detail: "off:Dominik Szoboszlai",
      source: "provider-a",
    },
  ],
  stats: {
    homeShots: 14,
    awayShots: 10,
    homeShotsOnTarget: 5,
    awayShotsOnTarget: 7,
    homePossession: 45,
    awayPossession: 55,
    homeCorners: 6,
    awayCorners: 3,
    homeSaves: 5,
    awaySaves: 5,
    source: "provider-a",
  },
};

const previous = {
  stub: process.env.PUNDIT_MODEL_STUB,
  prelaunch: process.env.PRELAUNCH_MODE,
  publication: process.env.PUNDIT_PUBLICATION_ENABLED,
};

beforeAll(() => {
  process.env.PUNDIT_MODEL_STUB = "true";
  // The stub refuses a publishing posture by design, so the rehearsal states
  // one: this is exactly the environment a private rehearsal runs in.
  process.env.PRELAUNCH_MODE = "true";
  process.env.PUNDIT_PUBLICATION_ENABLED = "false";
});

afterAll(() => {
  process.env.PUNDIT_MODEL_STUB = previous.stub;
  process.env.PRELAUNCH_MODE = previous.prelaunch;
  process.env.PUNDIT_PUBLICATION_ENABLED = previous.publication;
});

describe("the writing and judging path, end to end and free", () => {
  const pack = buildEvidencePack(ipswichLiverpool);

  it("licenses claims from a sealed pack", async () => {
    const claims = await generateClaimLaboratory(pack);
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(claim.matchId).toBe(pack.matchId);
      expect(claim.evidenceRefs.length).toBeGreaterThan(0);
    }
  });

  it.each([...PUNDIT_IDS])("carries %s from claims to a judged variant", async (punditId) => {
    const claims = await generateClaimLaboratory(pack);
    const variant = await generatePunditVariant({ punditId, pack, claims });

    expect(variant.candidate.punditId).toBe(punditId);
    expect(variant.candidate.displayScript.length).toBeGreaterThan(0);
    expect(variant.candidate.performancePlan.length).toBe(10);
    expect(variant.attempts).toBeGreaterThanOrEqual(1);
    expect(variant.attemptResults.length).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(variant.costUsd)).toBe(true);

    // The stub is built to satisfy the gates, so an approved variant is the
    // expected outcome and a quarantined one is a signal: either a gate has
    // changed its mind about acceptable prose, or the stub has drifted from
    // what the gates require. Either way it is worth knowing here, for
    // nothing, rather than in a paid run.
    expect(variant.results.filter((result) => !result.passed).map((r) => r.harness)).toEqual([]);
    expect(variant.status).toBe("approved");

    // Every harness the publish gate requires must have returned a verdict.
    // A dimension that silently stops being judged would let a variant reach
    // listeners unjudged, and the gate would refuse it with nothing to explain
    // why.
    const judged = new Set(variant.results.map((result) => result.harness));
    for (const required of REQUIRED_HARNESS_NAMES) {
      expect(judged, `${punditId} did not judge ${required}`).toContain(required);
    }
    for (const result of variant.results) {
      if (!result.passed) expect(typeof result.failure).toBe("string");
    }
  });
});

/** The writer prompt is one long single-quoted string, and an apostrophe in an
 *  addition to it silently ends the string and breaks the build. That happened
 *  while writing the instruction above this test. The prompt is also the one
 *  place a rule can be added without any test noticing it went missing, so the
 *  rules the last runs were lost to are pinned here. */
describe("the standards both sides are held to", () => {
  it("tells the writer to test a claim rather than repeat it", async () => {
    const { DIMENSION_STANDARDS } = await import("./dimensions");
    expect(DIMENSION_STANDARDS.independence).toContain("does not cite");
    expect(DIMENSION_STANDARDS.independence).toContain("Building on a licensed claim is expected");
  });

  /** The floors are four out of five and, until 2026-09-06, nothing told a
   *  judge what a four was. The one show that ever published scored twelve of
   *  twelve before the standards landed and three of twelve after, on the same
   *  script against the same evidence, because a judge with no anchor scores
   *  against its own idea of excellent. The anchor is what makes the floor
   *  mean something, so it is pinned rather than left to a prompt edit. */
  it("tells the judge what a four is, in professional terms", async () => {
    const { SCORE_ANCHORS, SCORING_INSTRUCTION } = await import("./dimensions");
    expect(SCORE_ANCHORS).toContain("4:");
    expect(SCORE_ANCHORS).toContain("professional");
    expect(SCORE_ANCHORS).toContain("do not undermine the dimension belong at 4");
    expect(SCORING_INSTRUCTION).toContain("not against an ideal script");
    for (const value of ["1:", "2:", "3:", "4:", "5:"]) {
      expect(SCORE_ANCHORS, `scale is missing ${value}`).toContain(value);
    }
  });

  it("keeps a standard for every dimension the publish gate requires", async () => {
    const { DIMENSION_STANDARDS } = await import("./dimensions");
    for (const [dimension, standard] of Object.entries(DIMENSION_STANDARDS)) {
      expect(standard.length, dimension).toBeGreaterThan(60);
    }
  });
});

/** The 2026-09-06 run put four of six writers in a vice I built: the prompt
 *  told them to state a likelihood as "a percentage, or odds", they wrote
 *  "better than sixty percent", and the numeric licence gate refused 60 because
 *  it is not in the evidence pack. On the repair round they retreated to bare
 *  words and the probability judge scored them 3 for vagueness. Both sides now
 *  say the same thing: state the likelihood in words, and attach it to
 *  something that could actually go either way. */
describe("the probability instruction and the numeric gate agreeing", () => {
  it("stops telling the writer to invent a percentage", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/pundit/pundit-generator.server.ts", "utf8"),
    );
    expect(source).toContain("state it in words rather than in figures");
    expect(source).toContain("Never invent a percentage or a price for it");
    expect(source).not.toContain("attach an explicit likelihood to a named outcome: a percentage");
  });

  it("tells the judge that words are the expected form", async () => {
    const { DIMENSION_STANDARDS } = await import("./dimensions");
    expect(DIMENSION_STANDARDS.probability).toContain("in words");
    expect(DIMENSION_STANDARDS.probability).toContain("is not a weakness");
    expect(DIMENSION_STANDARDS.probability).toContain("genuinely contestable");
  });

  it("keeps the rules the last two runs were lost to", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/pundit/pundit-generator.server.ts", "utf8"),
    );
    // Never state a distance: two pundits invented "thirty yards" and
    // "twenty-five yards", which the feed does not record.
    expect(source).toContain("Never state a distance in yards or metres");
    // Home and away: one pundit gave Ipswich Liverpool's possession figure.
    expect(source).toContain("says home or away and name the team that id belongs to");
    // Restraint: the judges rejected five of six for restating one point.
    expect(source).toContain("State your central point in full in the judgment beat and nowhere else");
  });
});

/** Six pundits is the product. One is a test, and the difference is about six
 *  sevenths of the bill. Measured on 2026-09-06: a run cost $2.14, of which the
 *  writer took $1.06 across twelve Opus calls and the judges $0.99 across
 *  eighty four Sonnet calls, both dominated by output tokens rather than by the
 *  cached evidence pack. Nearly every debugging run this week paid full price to
 *  learn what one pundit would have shown. */
describe("writing a subset of the pundits", () => {
  it("accepts a subset on the workflow input and the dispatch route", async () => {
    const [workflow, route] = await Promise.all([
      import("node:fs").then((fs) => fs.readFileSync("src/workflows/daily-pundit.ts", "utf8")),
      import("node:fs").then((fs) =>
        fs.readFileSync("src/routes/api/internal/daily-rehearsal.ts", "utf8"),
      ),
    ]);
    expect(workflow).toContain("punditIds?: PunditId[]");
    // The subset is filtered from the canonical list rather than trusted, so an
    // unknown id cannot introduce a pundit that has no spec.
    expect(workflow).toContain("PUNDIT_IDS.filter((punditId) => input.punditIds!.includes(punditId))");
    expect(route).toContain('url.searchParams.get("pundits")');
  });

  it("keeps the six-variant promise as the thing that stops a subset publishing", async () => {
    // No separate guard is added, and none should be: the promise check already
    // refuses a drop that does not hold all six, which is the correct outcome
    // for a diagnostic run.
    const { REQUIRED_HARNESS_NAMES } = await import("./promise-checks.server");
    expect(REQUIRED_HARNESS_NAMES.length).toBeGreaterThan(0);
    const promise = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/pundit/promise-checks.server.ts", "utf8"),
    );
    expect(promise).toMatch(/PUNDIT_IDS|six/i);
  });
});
