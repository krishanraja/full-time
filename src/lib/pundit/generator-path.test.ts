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

  it("keeps a standard for every dimension the publish gate requires", async () => {
    const { DIMENSION_STANDARDS } = await import("./dimensions");
    for (const [dimension, standard] of Object.entries(DIMENSION_STANDARDS)) {
      expect(standard.length, dimension).toBeGreaterThan(60);
    }
  });
});
