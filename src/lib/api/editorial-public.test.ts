import { describe, expect, it } from "vitest";
import {
  assemblePremierLeagueMatches,
  editionPack,
  editionPunditFor,
  fixtureFromPack,
  isValidDropId,
  projectProofCards,
} from "./editorial-public.server";

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

describe("placeholder sides from a missed join", () => {
  const fact = (id: string, value: unknown) =>
    ({ id, kind: "fact", label: id, value }) as never;

  it("never renders Home v Away as if it were a result", () => {
    expect(
      fixtureFromPack([fact("match.home_team", "Home"), fact("match.away_team", "Away")]),
    ).toBeNull();
  });

  it("drops the placeholder competition but keeps the real sides", () => {
    expect(
      fixtureFromPack([
        fact("match.home_team", "Tottenham"),
        fact("match.away_team", "Aston Villa"),
        fact("match.competition", "Competition"),
      ])?.competition,
    ).toBeNull();
  });
});

/** Live on 2026-09-27: two Premier League drops with one published show
 *  each, and one La Liga drop (Barcelona v Rayo Vallecano) that published a
 *  Romantic show on 2026-09-05. */
describe("Today shows Premier League matches, one at a time, newest first", () => {
  const drops = [
    { id: "d-0920", coverage_date: "2026-09-20", canonical_pundit: "zen" },
    { id: "d-0919", coverage_date: "2026-09-19", canonical_pundit: "zen" },
    { id: "d-0831", coverage_date: "2026-08-31", canonical_pundit: "zen" },
    { id: "d-empty", coverage_date: "2026-08-15", canonical_pundit: "zen" },
  ];
  const variants = [
    { drop_id: "d-0920", pundit_id: "romantic" },
    { drop_id: "d-0919", pundit_id: "gaffer" },
    { drop_id: "d-0831", pundit_id: "romantic" },
  ];
  const packs = [
    { drop_id: "d-0920", match_id: "af_1557413", sealed_at: "2026-09-21T19:11:00Z" },
    { drop_id: "d-0920", match_id: "af_1557413", sealed_at: "2026-09-21T19:31:00Z" },
    { drop_id: "d-0919", match_id: "af_1557416", sealed_at: "2026-09-21T22:45:00Z" },
    { drop_id: "d-0831", match_id: "af_1570354", sealed_at: "2026-09-05T00:25:00Z" },
    { drop_id: "d-empty", match_id: "af_1", sealed_at: "2026-08-16T00:00:00Z" },
  ];
  const team = (name: string) => ({ name, crest_url: `https://img.test/${name}.png` });
  const matches = [
    {
      id: "af_1557413",
      league_id: "af_39",
      home_score: 5,
      away_score: 3,
      home: team("Manchester City"),
      away: team("Sunderland"),
      league: { name: "Premier League" },
    },
    {
      id: "af_1557416",
      league_id: "af_39",
      home_score: 2,
      away_score: 3,
      home: team("Tottenham"),
      away: team("Aston Villa"),
      league: { name: "Premier League" },
    },
    {
      id: "af_1570354",
      league_id: "af_140",
      home_score: 5,
      away_score: 1,
      home: team("Barcelona"),
      away: team("Rayo Vallecano"),
      league: { name: "La Liga" },
    },
    {
      id: "af_1",
      league_id: "af_39",
      home_score: 1,
      away_score: 1,
      home: team("Arsenal"),
      away: team("Chelsea"),
      league: { name: "Premier League" },
    },
  ];
  const assembled = assemblePremierLeagueMatches({ drops, variants, packs, matches });

  it("leaves out every other league", () => {
    expect(assembled.map((match) => match.dropId)).not.toContain("d-0831");
  });

  it("leaves out a match nobody published a show for", () => {
    expect(assembled.map((match) => match.dropId)).not.toContain("d-empty");
  });

  it("orders by the day the match was played, not by publication time", () => {
    expect(assembled.map((match) => match.dropId)).toEqual(["d-0920", "d-0919"]);
  });

  it("says who played, the score, and which pundits made a show", () => {
    expect(assembled[0]).toMatchObject({
      coverageDate: "2026-09-20",
      fixture: {
        homeTeam: "Manchester City",
        awayTeam: "Sunderland",
        homeScore: 5,
        awayScore: 3,
        competition: "Premier League",
        homeCrest: "https://img.test/Manchester%20City.png",
      },
      pundits: ["romantic"],
    });
  });

  it("keeps the six-pundit order whatever order the rows arrive in", () => {
    const shuffled = assemblePremierLeagueMatches({
      drops: [drops[0]],
      variants: [
        { drop_id: "d-0920", pundit_id: "banter" },
        { drop_id: "d-0920", pundit_id: "zen" },
        { drop_id: "d-0920", pundit_id: "stats" },
      ],
      packs,
      matches,
    });
    expect(shuffled[0].pundits).toEqual(["zen", "stats", "banter"]);
  });

  it("opens on the listener's pundit only when they made a show for this match", () => {
    const [cityGame] = assembled;
    expect(editionPunditFor(cityGame, "romantic")).toBe("romantic");
    // The Reporter made nothing for this match: open on who did, and the
    // player names them. Never a different match by the Reporter.
    expect(editionPunditFor(cityGame, "zen")).toBe("romantic");
    expect(editionPunditFor({ ...cityGame, pundits: [] }, "zen")).toBeNull();
  });

  it("prefers the drop's canonical pundit when the listener's has no show", () => {
    expect(
      editionPunditFor({ pundits: ["zen", "gaffer", "banter"], canonicalPundit: "gaffer" }, "doomer"),
    ).toBe("gaffer");
  });
});

describe("the pack an edition was written from", () => {
  const newestFirst = [{ id: "pack-3" }, { id: "pack-2" }, { id: "pack-1" }];

  it("is the pack its licensed claims name, not whichever row came back", () => {
    expect(
      editionPack(newestFirst, [
        { evidence_pack_id: "pack-2" },
        { evidence_pack_id: "pack-2" },
        { evidence_pack_id: "pack-1" },
      ])?.id,
    ).toBe("pack-2");
  });

  it("falls back to the latest sealed pack when no claim names one", () => {
    expect(editionPack(newestFirst, [])?.id).toBe("pack-3");
    expect(editionPack(newestFirst, [{ evidence_pack_id: "gone" }])?.id).toBe("pack-3");
    expect(editionPack([], [])).toBeNull();
  });
});
