import { describe, expect, it } from "vitest";
import { isValidDropId, projectProofCards, fixtureFromPack } from "./editorial-public.server";

describe("public editorial identifiers", () => {
  it("accepts database UUIDs", () => {
    expect(isValidDropId("2775bfc5-5852-4b24-8577-c0d9fb54c58f")).toBe(true);
  });

  it("rejects malformed identifiers before they reach PostgREST", () => {
    expect(isValidDropId("not-a-real-drop")).toBe(false);
    expect(isValidDropId("2775bfc5-5852-4b24-8577-c0d9fb54c58f-extra")).toBe(false);
  });
});

describe("proof card projection", () => {
  it("uses only licensed claim references that exist in sealed evidence", () => {
    const cards = projectProofCards(
      [
        {
          id: "claim-1",
          thesis: "The late pressure changed the match.",
          type: "mechanism",
          evidence_refs: ["shots-after-60", "missing-ref"],
          alternative_explanation: "The other team may simply have tired.",
          missing_evidence: [],
        },
      ],
      [
        {
          id: "shots-after-60",
          kind: "derived",
          label: "Shots after 60 minutes",
          value: 7,
          source: "sealed match feed",
          provenance: "fixture",
        },
      ],
    );

    expect(cards).toEqual([
      {
        id: "claim-1",
        claim: "The late pressure changed the match.",
        evidence: ["Shots after 60 minutes: 7"],
        boundary: "This cannot rule out: The other team may simply have tired.",
      },
    ]);
  });

  it("drops claims with no supporting evidence and caps the public set at three", () => {
    const evidence = [
      {
        id: "score",
        kind: "fact" as const,
        label: "Final score",
        value: "2-1",
        source: "sealed match feed",
        provenance: "fixture",
      },
    ];
    const claim = (id: string, refs = ["score"]) => ({
      id,
      thesis: `Claim ${id}`,
      type: "fact",
      evidence_refs: refs,
      alternative_explanation: null,
      missing_evidence: [],
    });
    expect(projectProofCards([claim("missing", ["nope"])], evidence)).toEqual([]);
    expect(
      projectProofCards([claim("1"), claim("2"), claim("3"), claim("4")], evidence),
    ).toHaveLength(3);
  });
});

/** The surface carried teamIds - af_50, af_746 - which name nothing to a
 *  listener, and no score at all. Both sit in the sealed pack that is already
 *  loaded to build the proof cards. */
describe("the fixture is read from the pack that is already loaded", () => {
  const fact = (id: string, value: unknown) =>
    ({ id, kind: "fact", label: id, value }) as never;
  const full = [
    fact("match.home_team", "Manchester City"),
    fact("match.away_team", "Sunderland"),
    fact("match.home_score", 5),
    fact("match.away_score", 3),
    fact("match.competition", "Premier League"),
  ];

  it("names both sides and the score", () => {
    expect(fixtureFromPack(full)).toEqual({
      homeTeam: "Manchester City",
      awayTeam: "Sunderland",
      homeScore: 5,
      awayScore: 3,
      competition: "Premier League",
    });
  });

  it("still returns the sides when the competition is absent", () => {
    expect(fixtureFromPack(full.slice(0, 4))?.competition).toBeNull();
  });

  it("keeps a nil-nil, which is a real score and not a missing one", () => {
    const drawn = [
      fact("match.home_team", "A"),
      fact("match.away_team", "B"),
      fact("match.home_score", 0),
      fact("match.away_score", 0),
    ];
    expect(fixtureFromPack(drawn)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });

  // A scoreboard naming one team is worse than none: the reader cannot tell
  // whether the other side is missing or the layout broke.
  it("returns nothing rather than half a fixture", () => {
    expect(fixtureFromPack([fact("match.home_team", "Manchester City")])).toBeNull();
    expect(fixtureFromPack([])).toBeNull();
  });

  it("refuses a team name that is not a non-empty string", () => {
    expect(fixtureFromPack([fact("match.home_team", "  "), fact("match.away_team", "B")])).toBeNull();
    expect(fixtureFromPack([fact("match.home_team", 50), fact("match.away_team", "B")])).toBeNull();
  });
});
