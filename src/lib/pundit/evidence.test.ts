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
