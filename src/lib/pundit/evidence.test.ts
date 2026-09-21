import { describe, expect, it } from "vitest";
import { buildEvidencePack, type StructuredMatchInput } from "./evidence";
import { licenseClaim, unsupportedTacticsSpans } from "./claim-lab";
import { runHardGates } from "./harness";
import type { AnalysisClaim, BeatName, PunditVariantCandidate } from "./types";

const input: StructuredMatchInput = {
  match: {
    id: "match-1",
    homeTeam: "North FC",
    awayTeam: "South FC",
    homeScore: 1,
    awayScore: 2,
    kickoffAt: "2026-08-08T19:00:00Z",
    competition: "Test League",
    source: "provider-a",
  },
  events: [
    {
      id: "goal-1",
      type: "goal",
      minute: 18,
      team: "North FC",
      player: "A One",
      source: "provider-a",
    },
    {
      id: "goal-2",
      type: "goal",
      minute: 71,
      team: "South FC",
      player: "B Two",
      source: "provider-a",
    },
    {
      id: "goal-3",
      type: "goal",
      minute: 89,
      team: "South FC",
      player: "C Three",
      source: "provider-a",
    },
  ],
  stats: {
    homeXg: 2.4,
    awayXg: 1.1,
    homeShots: 15,
    awayShots: 7,
    homeShotsOnTarget: 5,
    awayShotsOnTarget: 3,
    source: "provider-a",
  },
  feedsAgree: true,
};

describe("evidence packs and claim licensing", () => {
  it("stores deterministic formulas and explicit missing evidence", () => {
    const pack = buildEvidencePack(input);
    expect(pack.derivations.find((item) => item.id === "derived.xg_difference")).toMatchObject({
      value: 1.3,
      formula: "round(home_xg - away_xg, 2)",
    });
    expect(pack.unavailableEvidence).toContain("pressing triggers or pressing shapes");
  });

  it("licenses an outcome-versus-process judgment with exact references", () => {
    const pack = buildEvidencePack(input);
    const claim: AnalysisClaim = {
      id: "claim-1",
      matchId: "match-1",
      type: "opinion",
      thesis: "The result rewarded South FC, while the available xG estimate favoured North FC.",
      evidenceRefs: ["match.home_score", "match.away_score", "stats.home_xg", "stats.away_xg"],
      confidence: 0.9,
      alternativeExplanation: "xG is an estimate and this is one match.",
    };
    expect(licenseClaim(claim, pack)).toEqual({ licensed: true, failures: [] });
  });

  it("blocks film-specific tactics and missing references", () => {
    const pack = buildEvidencePack(input);
    const claim: AnalysisClaim = {
      id: "claim-2",
      matchId: "match-1",
      type: "mechanism",
      thesis:
        "The rest defence failed because the full-back was deliberately left one against two.",
      evidenceRefs: ["film.sequence.12"],
      confidence: 0.8,
    };
    const licensed = licenseClaim(claim, pack);
    expect(licensed.licensed).toBe(false);
    expect(licensed.failures.join(" ")).toMatch(/film|tracking|Unknown evidence/i);
    expect(unsupportedTacticsSpans(claim.thesis).length).toBeGreaterThan(0);
  });

  it("requires falsifiable predictions", () => {
    const pack = buildEvidencePack(input);
    const claim: AnalysisClaim = {
      id: "claim-3",
      matchId: "match-1",
      type: "prediction",
      thesis: "North FC will create the greater xG total next match.",
      evidenceRefs: ["stats.home_xg"],
      confidence: 0.6,
    };
    expect(licenseClaim(claim, pack).failures).toEqual(
      expect.arrayContaining([
        "prediction requires a falsifier.",
        "prediction requires a structured evaluation rule.",
      ]),
    );
  });

  it("blocks unlicensed numbers, entities and season consequences in prose", () => {
    const pack = buildEvidencePack(input);
    const claim: AnalysisClaim = {
      id: "claim-licensed",
      matchId: "match-1",
      type: "fact",
      thesis: "South FC won 2-1.",
      evidenceRefs: ["match.home_score", "match.away_score"],
      confidence: 1,
    };
    const beatNames: BeatName[] = [
      "hook",
      "match_story",
      "evidence",
      "explanation",
      "judgment",
      "counterpoint",
      "humour",
      "portable_line",
      "prediction_or_receipt",
      "close",
    ];
    const beatText = beatNames.map((name, index) =>
      index === 0
        ? "North FC had 99 shots and won the title in Madrid."
        : `The evidence remains limited for ${name.replaceAll("_", " ")}.`,
    );
    const candidate: PunditVariantCandidate = {
      punditId: "zen",
      specVersion: 1,
      thesis: {
        punditId: "zen",
        headline: "A licensed result",
        judgment: "South FC won.",
        selectedClaimIds: [claim.id],
        rejectedClaimIds: [],
        counterpoint: "One match is a small sample.",
        changeMyMind: "More matches.",
      },
      outline: Object.fromEntries(
        beatNames.map((name, index) => [name, beatText[index]]),
      ) as PunditVariantCandidate["outline"],
      displayScript: beatText.join(" "),
      spokenScript: beatText.join(" "),
      performancePlan: beatText.map((text) => ({
        text,
        intent: "explanation" as const,
        pace: "measured" as const,
        energy: 3 as const,
      })),
      claimIds: [claim.id],
    };
    const results = runHardGates({ pack, claims: [claim], candidate });
    expect(results.find((result) => result.harness === "numeric_licence")?.passed).toBe(false);
    expect(results.find((result) => result.harness === "entity_licence")?.passed).toBe(false);
    expect(results.find((result) => result.harness === "consequence_licence")?.passed).toBe(false);
  });
});

describe("own goal labelling", () => {
  it("names the team it counts for and the side the scorer plays for", () => {
    const pack = buildEvidencePack({
      ...input,
      events: [
        {
          id: "og-1",
          type: "own_goal",
          minute: 63,
          team: "South FC",
          player: "A One",
          source: "provider-a",
        },
      ],
    });
    const label = pack.facts.find((item) => item.id === "event.og-1")?.label ?? "";
    expect(label).toContain("counts as a goal for South FC");
    expect(label).toContain("A One of North FC");
  });

  it("leaves an ordinary goal label alone", () => {
    const pack = buildEvidencePack(input);
    expect(pack.facts.find((item) => item.id === "event.goal-1")?.label).toBe("goal event");
  });
});

describe("substitution labelling", () => {
  const withSub = {
    ...input,
    events: [
      {
        id: "sub-1",
        type: "sub" as const,
        minute: 68,
        team: "North FC",
        player: "In Coming",
        detail: "off:Out Going",
        source: "provider-a",
      },
    ],
  };

  it("names who came on and who went off", () => {
    const pack = buildEvidencePack(withSub);
    expect(pack.facts.find((item) => item.id === "event.sub-1")?.label).toBe(
      "substitution event: North FC bring on In Coming for Out Going",
    );
  });

  it("licenses the outgoing player by putting him in the value", () => {
    const pack = buildEvidencePack(withSub);
    const value = pack.facts.find((item) => item.id === "event.sub-1")?.value;
    expect(value).toContain("Out Going");
  });

  it("copes with a substitution that has no recorded detail", () => {
    const pack = buildEvidencePack({
      ...withSub,
      events: [{ ...withSub.events[0], detail: null }],
    });
    expect(pack.facts.find((item) => item.id === "event.sub-1")?.label).toBe(
      "substitution event: North FC bring on In Coming",
    );
  });
});

/** Who made the goal is the second most interesting fact about it, and the pack
 *  threw it away from the day it was first ingested. */
describe("who assisted the goal", () => {
  const assisted = {
    ...input,
    events: [
      {
        id: "goal-1",
        type: "goal" as const,
        minute: 23,
        team: "North FC",
        player: "Scorer Name",
        assist: "Passer Name",
        source: "provider-a",
      },
    ],
  };

  it("names the assister in the label", () => {
    const pack = buildEvidencePack(assisted);
    expect(pack.facts.find((item) => item.id === "event.goal-1")?.label).toBe(
      "goal event: Scorer Name of North FC, assisted by Passer Name",
    );
  });

  it("licenses the assister by putting him in the value", () => {
    const pack = buildEvidencePack(assisted);
    expect(pack.facts.find((item) => item.id === "event.goal-1")?.value).toContain("Passer Name");
  });

  it("says nothing about an assist on an unassisted goal", () => {
    const pack = buildEvidencePack({
      ...assisted,
      events: [{ ...assisted.events[0], assist: null }],
    });
    const item = pack.facts.find((entry) => entry.id === "event.goal-1");
    expect(item?.label).toBe("goal event");
    expect(item?.value).not.toContain("Passer Name");
  });

  /** The provider keeps the incoming player of a substitution in the same
   *  column as the assister, which the ingest de-inverts. If the pack ever
   *  reads it for a substitution it will present the man who went off as
   *  having assisted, and no gate can catch that: he is a real player who
   *  really was on the pitch, so the entity licence passes him and a judge has
   *  no reason to doubt it. */
  it("never calls a substituted player an assister", () => {
    const pack = buildEvidencePack({
      ...input,
      events: [
        {
          id: "sub-1",
          type: "sub" as const,
          minute: 68,
          team: "North FC",
          player: "In Coming",
          detail: "off:Out Going",
          assist: "Out Going",
          source: "provider-a",
        },
      ],
    });
    const item = pack.facts.find((entry) => entry.id === "event.sub-1");
    expect(item?.label).toBe("substitution event: North FC bring on In Coming for Out Going");
    expect(item?.label).not.toContain("assisted");
    // Once, not twice: the outgoing player is already licensed by the detail
    // field, and the pack should not gain a second copy of him from a column
    // that does not mean what its name says for this event type.
    expect((item?.value as unknown[]).filter((entry) => entry === "Out Going")).toHaveLength(1);
  });
});

describe("shot location, the chance-quality signal that survived", () => {
  const withShots = (over: Record<string, number>) =>
    buildEvidencePack({
      match: {
        id: "m",
        homeTeam: "Ipswich",
        awayTeam: "Liverpool",
        homeScore: 0,
        awayScore: 2,
        kickoffAt: "2026-09-04T19:00:00Z",
        competition: "Premier League",
        source: "p",
      },
      events: [],
      stats: { source: "provider", ...over },
    } as never);

  const derivation = (pack: ReturnType<typeof withShots>, id: string) =>
    pack.derivations.find((item) => item.id === id);

  it("states where each side shot from, as a share", () => {
    const pack = withShots({
      homeShotsInsideBox: 4,
      homeShotsOutsideBox: 10,
      awayShotsInsideBox: 7,
      awayShotsOutsideBox: 3,
    });
    // Fourteen shots each way is the same number and a different match.
    // Stated as whole percent because that is how a pundit says it, and a
    // figure it cannot say exactly is one it will round into a refusal.
    expect(derivation(pack, "derived.home_inside_box_percent")?.value).toBe(29);
    expect(derivation(pack, "derived.away_inside_box_percent")?.value).toBe(70);
  });

  it("says nothing when the provider sent no locations", () => {
    const pack = withShots({ homeShots: 14 });
    expect(derivation(pack, "derived.home_inside_box_percent")).toBeUndefined();
  });

  it("says nothing rather than dividing by no shots at all", () => {
    const pack = withShots({ homeShotsInsideBox: 0, homeShotsOutsideBox: 0 });
    expect(derivation(pack, "derived.home_inside_box_percent")).toBeUndefined();
  });
});

/** The last chance-quality signal the provider still sends. A shot blocked by a
 *  defender never reached the keeper, so it separates what a side made from
 *  what it merely attempted - which is the distinction xG used to carry. */
describe("shots the defence blocked", () => {
  const blocked = {
    ...input,
    stats: { ...input.stats!, homeBlocked: 7, awayBlocked: 2 },
  };

  it("states each side's blocked shots and the match total", () => {
    const pack = buildEvidencePack(blocked);
    expect(pack.facts.find((item) => item.id === "stats.home_blocked")?.value).toBe(7);
    expect(pack.facts.find((item) => item.id === "stats.away_blocked")?.value).toBe(2);
    expect(pack.derivations.find((item) => item.id === "derived.match_blocked")?.value).toBe(9);
  });

  it("states nothing when the provider sent nothing", () => {
    const pack = buildEvidencePack(input);
    expect(pack.facts.find((item) => item.id === "stats.home_blocked")).toBeUndefined();
    expect(pack.derivations.find((item) => item.id === "derived.match_blocked")).toBeUndefined();
  });
});

/** Saves are recorded for a side and never for a player. The writer is told so
 *  in the system prompt and no gate enforces it, so the pack has to make the
 *  attribution itself or not at all. */
describe("attributing saves to the keeper who made them", () => {
  const wholeMatch = {
    ...input,
    stats: { ...input.stats!, homeSaves: 6, awaySaves: 3 },
    goalkeepers: {
      home: { name: "Steady Hands", subbed: false },
      away: { name: "Other Keeper", subbed: false },
    },
  };

  it("names the keeper in the label and keeps the number in the value", () => {
    const item = buildEvidencePack(wholeMatch).derivations.find(
      (entry) => entry.id === "derived.home_gk_saves",
    );
    expect(item?.label).toBe("Saves by Steady Hands");
    expect(item?.value).toBe(6);
    expect(item?.formula).toContain("played the whole match");
  });

  it("attributes nothing when the keeper was substituted", () => {
    const pack = buildEvidencePack({
      ...wholeMatch,
      goalkeepers: { ...wholeMatch.goalkeepers, home: { name: "Steady Hands", subbed: true } },
    });
    expect(pack.derivations.find((item) => item.id === "derived.home_gk_saves")).toBeUndefined();
  });

  /** Unknown is treated as substituted. Half a match of saves attributed to one
   *  of two keepers is the error this exists to prevent, and an unrecorded
   *  substitution is exactly the case where it would happen. */
  it("attributes nothing when the substitution is unrecorded", () => {
    const pack = buildEvidencePack({
      ...wholeMatch,
      goalkeepers: { ...wholeMatch.goalkeepers, home: { name: "Steady Hands", subbed: null } },
    });
    expect(pack.derivations.find((item) => item.id === "derived.home_gk_saves")).toBeUndefined();
  });

  it("attributes nothing when the provider sent no saves", () => {
    const pack = buildEvidencePack({ ...wholeMatch, stats: input.stats });
    expect(pack.derivations.find((item) => item.id === "derived.home_gk_saves")).toBeUndefined();
  });

  it("attributes nothing when the keeper is not named", () => {
    const pack = buildEvidencePack({
      ...wholeMatch,
      goalkeepers: { ...wholeMatch.goalkeepers, home: { name: null, subbed: false } },
    });
    expect(pack.derivations.find((item) => item.id === "derived.home_gk_saves")).toBeUndefined();
  });
});

/** standings_snapshots existed for six weeks with nothing writing to it, and
 *  the cost of that empty table was the gate in harness.ts that refuses every
 *  sentence about the season. */
describe("where these two stood in the table", () => {
  const withTable = {
    ...input,
    matchday: 5,
    table: {
      capturedAt: "2026-09-05T00:15:00Z",
      home: { rank: 3, points: 10, played: 5 },
      away: { rank: 12, points: 5, played: 5 },
    },
  };

  it("states each side's position, points and matches played", () => {
    const pack = buildEvidencePack(withTable);
    expect(pack.facts.find((item) => item.id === "table.home_rank")?.value).toBe(3);
    expect(pack.facts.find((item) => item.id === "table.away_points")?.value).toBe(5);
    expect(pack.facts.find((item) => item.id === "table.home_played")?.value).toBe(5);
  });

  it("states the gap, which is the figure a pundit actually reaches for", () => {
    const item = buildEvidencePack(withTable).derivations.find(
      (entry) => entry.id === "derived.table_points_gap",
    );
    expect(item?.value).toBe(5);
    expect(item?.formula).toContain("difference");
  });

  /** The provenance is the audit trail for a season-level sentence: which
   *  snapshot licensed it, and when that snapshot was taken. */
  it("records which snapshot licensed it", () => {
    const item = buildEvidencePack(withTable).facts.find((entry) => entry.id === "table.home_rank");
    expect(item?.provenance).toContain("2026-09-05T00:15:00Z");
  });

  it("states nothing at all when there is no snapshot", () => {
    const pack = buildEvidencePack(input);
    expect(pack.facts.some((item) => item.id.startsWith("table."))).toBe(false);
    expect(pack.derivations.some((item) => item.id.startsWith("table."))).toBe(false);
  });

  it("states one side when the snapshot only knows one of them", () => {
    const pack = buildEvidencePack({
      ...withTable,
      table: { ...withTable.table, away: undefined },
    });
    expect(pack.facts.find((item) => item.id === "table.home_rank")?.value).toBe(3);
    expect(pack.facts.find((item) => item.id === "table.away_rank")).toBeUndefined();
    expect(pack.derivations.find((item) => item.id === "derived.table_points_gap")).toBeUndefined();
  });

  /** The round is a fact about the calendar, not about the table, and it must
   *  not license a positional sentence on its own. */
  it("keeps the league round out of the table namespace", () => {
    const pack = buildEvidencePack({ ...input, matchday: 5 });
    expect(pack.facts.find((item) => item.id === "match.matchday")?.value).toBe(5);
    expect(pack.facts.some((item) => item.id.startsWith("table."))).toBe(false);
  });
});

/** A number a model produced is not a number anyone counted, and until the
 *  estimate kind existed the pack had no way to say so. Expected goals is why
 *  it matters: carried as a plain fact it is indistinguishable from a shot
 *  count, which is how a pundit ends up saying a side should have scored two
 *  as though someone had counted them. */
describe("numbers a model produced", () => {
  const withEstimates = {
    ...input,
    estimates: [
      { sourceId: "fotmob", model: "FotMob expected goals", homeXg: 0.79, awayXg: 1.65 },
      { sourceId: "other", model: "Another model", homeXg: 1.4, awayXg: 1.6 },
    ],
  };

  it("marks an estimate as an estimate and names the model", () => {
    const item = buildEvidencePack(withEstimates).derivations.find(
      (entry) => entry.id === "estimate.fotmob_home_xg",
    );
    expect(item?.kind).toBe("estimate");
    expect(item?.model).toBe("FotMob expected goals");
    expect(item?.value).toBe(0.79);
  });

  /** The label is what the writer reads, so the label has to carry it too. */
  it("says in the label that it was not counted", () => {
    const item = buildEvidencePack(withEstimates).derivations.find(
      (entry) => entry.id === "estimate.fotmob_home_xg",
    );
    expect(item?.label).toContain("estimated by FotMob expected goals");
    expect(item?.label).toContain("not counted");
  });

  it("carries every model's number rather than picking one", () => {
    const ids = buildEvidencePack(withEstimates).derivations.map((entry) => entry.id);
    expect(ids).toContain("estimate.fotmob_home_xg");
    expect(ids).toContain("estimate.other_home_xg");
  });

  /** The payoff for multi-sourcing, and the one thing a single feed can never
   *  produce. Two models disagreeing about whether a chance was good is a
   *  better line than either number alone. */
  it("states how far the models are apart when they disagree", () => {
    const item = buildEvidencePack(withEstimates).derivations.find(
      (entry) => entry.id === "derived.home_xg_disagreement",
    );
    expect(item?.value).toBe(0.61);
    expect(item?.source).toContain("FotMob");
  });

  it("says nothing when the models agree closely enough not to be worth a line", () => {
    const pack = buildEvidencePack(withEstimates);
    // The away figures are 1.65 and 1.60.
    expect(
      pack.derivations.find((item) => item.id === "derived.away_xg_disagreement"),
    ).toBeUndefined();
  });

  it("says nothing about disagreement when only one model answered", () => {
    const pack = buildEvidencePack({
      ...input,
      estimates: [withEstimates.estimates[0]],
    });
    expect(
      pack.derivations.find((item) => item.id === "derived.home_xg_disagreement"),
    ).toBeUndefined();
    expect(pack.derivations.find((item) => item.id === "estimate.fotmob_home_xg")).toBeDefined();
  });

  it("carries nothing at all when no source answered", () => {
    const pack = buildEvidencePack(input);
    expect(pack.derivations.some((item) => item.kind === "estimate")).toBe(false);
  });
});

describe("time a side had to respond to a goal", () => {
  const packWith = (minutes: number[]) =>
    buildEvidencePack({
      match: {
        id: "m",
        homeTeam: "Ipswich",
        awayTeam: "Liverpool",
        homeScore: 0,
        awayScore: 2,
        kickoffAt: "2026-09-04T19:00:00Z",
        competition: "Premier League",
        source: "p",
      },
      events: minutes.map((minute, index) => ({
        id: `g${index}`,
        type: "goal",
        minute,
        team: "Liverpool",
        player: "Alexander Isak",
        source: "p",
      })),
      stats: { source: "p" },
    } as never);

  const value = (pack: ReturnType<typeof packWith>, id: string) =>
    pack.derivations.find((item) => item.id === id)?.value;

  // "Ipswich had eighty-one minutes to solve it" is subtraction from two
  // licensed numbers, and the numeric licence refused the script for it twice.
  it("states the minutes after the opening and the last goal", () => {
    const pack = packWith([4, 9]);
    expect(value(pack, "derived.minutes_after_opening_goal")).toBe(86);
    expect(value(pack, "derived.minutes_after_last_goal")).toBe(81);
  });

  it("states one figure when a single goal decided it", () => {
    const pack = packWith([73]);
    expect(value(pack, "derived.minutes_after_opening_goal")).toBe(17);
    expect(value(pack, "derived.minutes_after_last_goal")).toBeUndefined();
  });

  it("says nothing about a goalless match", () => {
    expect(value(packWith([]), "derived.minutes_after_opening_goal")).toBeUndefined();
  });
});

describe("what each side arrived carrying", () => {
  const base = {
    match: {
      id: "m",
      homeTeam: "Ipswich",
      awayTeam: "Liverpool",
      homeScore: 0,
      awayScore: 2,
      kickoffAt: "2026-09-04T19:00:00Z",
      competition: "Premier League",
      source: "p",
    },
    events: [],
    stats: { source: "p" },
  };

  const packOf = (extra: Record<string, unknown>) =>
    buildEvidencePack({ ...base, ...extra } as never);

  const item = (pack: ReturnType<typeof packOf>, id: string) =>
    [...pack.facts, ...pack.derivations].find((entry) => entry.id === id);

  const form = {
    home: [
      {
        date: "2026-08-30T14:00:00Z",
        opponent: "Everton",
        venue: "away",
        goalsFor: 1,
        goalsAgainst: 1,
      },
      {
        date: "2026-08-23T14:00:00Z",
        opponent: "Brentford",
        venue: "home",
        goalsFor: 0,
        goalsAgainst: 2,
      },
    ],
    away: [
      {
        date: "2026-08-31T14:00:00Z",
        opponent: "Arsenal",
        venue: "home",
        goalsFor: 3,
        goalsAgainst: 0,
      },
    ],
  };

  // Six pundits kept being told their analysis was a truism. With one match and
  // nothing else in the pack, a truism is the only shape available.
  it("states a previous result as a fact a pundit can cite", () => {
    const pack = packOf({ form });
    expect(item(pack, "form.home_1")?.label).toBe("Ipswich drew away to Everton");
    expect(item(pack, "form.home_2")?.label).toBe("Ipswich lost at home to Brentford");
    expect(item(pack, "form.away_1")?.label).toBe("Liverpool won at home to Arsenal");
    // The scoreline lives in the value, which is what licenses the numbers.
    // Stating it in the label too doubled the pack for nothing.
    expect(item(pack, "form.home_1")?.value).toEqual(["2026-08-30", 1, 1]);
  });

  /** The pack presented Liverpool's 2025-12-06 draw at Leeds beside two August
   *  2026 results as though the three were a run, because the lookup took the
   *  three most recent finished matches with no lower bound. The claim
   *  laboratory licensed "three consecutive draws" from it, all six writers
   *  built on that, and four of six then failed the factual gate.
   *
   *  The lookup is now windowed, so a gap like that cannot reach the pack. This
   *  pins the other half: the pack states how many results the window actually
   *  holds and the dates they span, so a writer claiming a longer run than the
   *  evidence carries has a fact standing against it rather than a silent gap
   *  to infer across. */
  it("says how many results the form window holds and when they were", () => {
    const pack = packOf({ form });
    expect(item(pack, "form.home_span")?.value).toEqual([2, "2026-08-23", "2026-08-30"]);
    expect(item(pack, "form.away_span")?.value).toEqual([1, "2026-08-31", "2026-08-31"]);
    // A side with one result has one result, and the pack says so rather than
    // leaving three slots a writer can round up to.
    expect(item(pack, "form.away_2")).toBeUndefined();
  });

  it("counts the points a run of form produced", () => {
    const pack = packOf({ form });
    expect(item(pack, "derived.home_points_from_last_2")?.value).toBe(1);
    expect(item(pack, "derived.away_points_from_last_1")?.value).toBe(3);
  });

  it("states what these two have done to each other before", () => {
    const pack = packOf({
      headToHead: [
        {
          date: "2025-01-25T15:00:00Z",
          homeTeam: "Liverpool",
          awayTeam: "Ipswich",
          homeGoals: 4,
          awayGoals: 1,
        },
      ],
    });
    expect(item(pack, "h2h.meeting_1")?.label).toBe("Previous meeting at Liverpool");
    expect(item(pack, "h2h.meeting_1")?.value).toEqual([
      "2025-01-25",
      "Liverpool",
      "Ipswich",
      4,
      1,
    ]);
  });

  it("says nothing at all when neither is known", () => {
    const pack = packOf({});
    expect(item(pack, "form.home_1")).toBeUndefined();
    expect(item(pack, "h2h.meeting_1")).toBeUndefined();
    expect(item(pack, "derived.home_points_from_last_5")).toBeUndefined();
  });
});

/** "Twenty-four shots between these two" is a natural thing for a pundit to
 *  say and was refused on 2026-09-04, because 24 was not in the pack even
 *  though 14 and 10 both were. Stating the total is cheaper and more honest
 *  than teaching the licence gate arithmetic. */
describe("what the two sides produced between them", () => {
  it("states the match totals for the paired counting stats", () => {
    const pack = buildEvidencePack(input);
    const at = (id: string) =>
      [...pack.facts, ...pack.derivations].find((entry) => entry.id === id);
    expect(at("derived.match_shots")?.value).toBe(15 + 7);
    expect(at("derived.match_shots_on_target")?.value).toBe(5 + 3);
    expect(at("derived.match_shots")?.formula).toBe("home_shots + away_shots");
  });

  it("states no total when the feed is missing one side", () => {
    const pack = buildEvidencePack({
      ...input,
      stats: { ...input.stats, homeCorners: 6, awayCorners: undefined },
    } as never);
    expect(
      [...pack.facts, ...pack.derivations].find((entry) => entry.id === "derived.match_corners"),
    ).toBeUndefined();
  });
});
