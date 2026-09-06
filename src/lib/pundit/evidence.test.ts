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
      { date: "2026-08-30T14:00:00Z", opponent: "Everton", venue: "away", goalsFor: 1, goalsAgainst: 1 },
      { date: "2026-08-23T14:00:00Z", opponent: "Brentford", venue: "home", goalsFor: 0, goalsAgainst: 2 },
    ],
    away: [
      { date: "2026-08-31T14:00:00Z", opponent: "Arsenal", venue: "home", goalsFor: 3, goalsAgainst: 0 },
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
