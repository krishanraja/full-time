import { describe, expect, it } from "vitest";
import { buildEvidencePack, type StructuredMatchInput } from "./evidence";
import { consequenceSpans, runHardGates } from "./harness";
import type { AnalysisClaim, BeatName, PunditVariantCandidate } from "./types";

/** A frozen corpus of prose that a real run actually produced, and that the
 *  gates once rejected wrongly.
 *
 *  Every fragment below was written by the real writer against real match data
 *  and reported as a violation by a gate that had misread it. Each one cost a
 *  full six-pundit run to discover. They are kept here so that the next change
 *  to a gate is checked against them for nothing.
 *
 *  This is the seed of the golden set: the failures we have already paid for.
 *  `scripts/export-gate-corpus.mjs` widens it from the scripts stored in the
 *  database. Nothing in here should ever be "fixed" by loosening a gate; if a
 *  case starts failing, the gate changed its mind about real football prose. */

const BEAT_NAMES: BeatName[] = [
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

/** Toulouse 0-1 Lille, 2026-09-03. The numbers are the ones the pack carried. */
const toulouseLille: StructuredMatchInput = {
  match: {
    id: "match-tl",
    homeTeam: "Toulouse",
    awayTeam: "Lille",
    homeScore: 0,
    awayScore: 1,
    kickoffAt: "2026-09-03T19:00:00Z",
    competition: "Ligue 1",
    source: "provider-a",
  },
  events: [
    {
      id: "sub-ueda",
      type: "sub",
      minute: 57,
      team: "Lille",
      player: "Ayase Ueda",
      detail: "off:Hakon Haraldsson",
      source: "provider-a",
    },
    {
      id: "goal-ueda",
      type: "goal",
      minute: 73,
      team: "Lille",
      player: "Ayase Ueda",
      source: "provider-a",
    },
  ],
  stats: {
    homeShots: 24,
    awayShots: 10,
    homeShotsOnTarget: 10,
    awayShotsOnTarget: 6,
    homePossession: 53,
    awayPossession: 47,
    homeCorners: 6,
    awayCorners: 2,
    homeSaves: 5,
    awaySaves: 9,
    source: "provider-a",
  },
};

/** Barcelona 5-2 Rayo Vallecano, 2026-08-31. Carries expected goals, which is
 *  what surfaced the spoken-decimal fault. */
const barcelonaRayo: StructuredMatchInput = {
  match: {
    id: "match-br",
    homeTeam: "Barcelona",
    awayTeam: "Rayo Vallecano",
    homeScore: 5,
    awayScore: 2,
    kickoffAt: "2026-08-31T19:00:00Z",
    competition: "La Liga",
    source: "provider-a",
  },
  events: [
    {
      id: "goal-camello",
      type: "goal",
      minute: 12,
      team: "Rayo Vallecano",
      player: "Sergio Camello",
      source: "provider-a",
    },
  ],
  stats: {
    homeXg: 2.83,
    awayXg: 1.08,
    homeShots: 26,
    awayShots: 11,
    homeShotsOnTarget: 9,
    awayShotsOnTarget: 5,
    source: "provider-a",
  },
};

function candidateSaying(sentence: string, claim: AnalysisClaim): PunditVariantCandidate {
  // The sentence under test goes in the hook; the rest is deliberately inert so
  // that any gate that fires is reacting to the fragment and nothing else.
  const beatText = BEAT_NAMES.map((name, index) =>
    index === 0 ? sentence : `The reasoning continues for the ${name.replaceAll("_", " ")} beat.`,
  );
  return {
    punditId: "zen",
    specVersion: 1,
    thesis: {
      punditId: "zen",
      headline: "A licensed reading",
      judgment: "The evidence supports it.",
      selectedClaimIds: [claim.id],
      rejectedClaimIds: [],
      counterpoint: "One match is a small sample.",
      changeMyMind: "More matches.",
    },
    outline: Object.fromEntries(
      BEAT_NAMES.map((name, index) => [name, beatText[index]]),
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
}

function gateFailures(sentence: string, matchInput: StructuredMatchInput): string[] {
  const pack = buildEvidencePack(matchInput);
  const claim: AnalysisClaim = {
    id: "claim-1",
    matchId: matchInput.match.id,
    type: "fact",
    thesis: "The match was played.",
    evidenceRefs: ["match.home_team"],
    confidence: 1,
  };
  return (
    runHardGates({ pack, claims: [claim], candidate: candidateSaying(sentence, claim) })
      .filter((result) => !result.passed)
      // Length is a property of this cut-down fixture, not of the fragment.
      .filter((result) => result.harness !== "spoken_length")
      .map((result) => `${result.harness}: ${result.failure ?? ""}`)
  );
}

describe("prose the gates once rejected wrongly", () => {
  // The Numbers pundit, 2026-09-04, one harness from a published show:
  // "Liverpool didn't survive pressure, they survived optimism." A side
  // survives a corner and a spell of pressure long before it survives a
  // season, and the gate read the ordinary verb as a relegation claim.
  it("lets a team survive a passage of play", () => {
    expect(
      consequenceSpans(
        "If that's the case, Liverpool didn't survive pressure, they survived optimism.",
      ),
    ).toEqual([]);
    expect(consequenceSpans("They survived ten minutes of it and went again.")).toEqual([]);
  });

  it("still refuses a season survival claim", () => {
    expect(consequenceSpans("A win that all but survived relegation for them.").length).toBeGreaterThan(0);
    expect(consequenceSpans("This was survival football, and they know it.").length).toBeGreaterThan(0);
    expect(
      consequenceSpans("Survival was the only thing they secured tonight.").length,
    ).toBeGreaterThan(0);
  });

  it("accepts a compound number written out", () => {
    expect(
      gateFailures("Toulouse had twenty-four shots and ten on target.", toulouseLille),
    ).toEqual([]);
  });

  it("accepts a compound ordinal used for a minute", () => {
    expect(
      gateFailures(
        "Ayase Ueda came on in the fifty-seventh minute and scored in the seventy-third.",
        toulouseLille,
      ),
    ).toEqual([]);
  });

  it("accepts possession split as two spelled numbers", () => {
    expect(
      gateFailures("Possession sat fifty-three to forty-seven across the match.", toulouseLille),
    ).toEqual([]);
  });

  it("accepts a spoken decimal", () => {
    expect(
      gateFailures(
        "On expected goals it was two point eight three to one point zero eight.",
        barcelonaRayo,
      ),
    ).toEqual([]);
  });

  it("accepts the same decimal in digits", () => {
    expect(
      gateFailures("Barcelona created 2.83 expected goals against 1.08.", barcelonaRayo),
    ).toEqual([]);
  });

  it("accepts a possessive team name", () => {
    expect(
      gateFailures("Barcelona out-shot them twenty-six to Rayo's eleven.", barcelonaRayo),
    ).toEqual([]);
  });

  it("accepts a possessive player surname", () => {
    expect(gateFailures("Barcelona answered Camello's early goal.", barcelonaRayo)).toEqual([]);
  });

  it("accepts a contraction of the pronoun I", () => {
    expect(
      gateFailures(
        "In fairness to Toulouse, and I'll say it once, I'm not convinced.",
        toulouseLille,
      ),
    ).toEqual([]);
  });

  it("accepts ordinary match verbs with no season stake", () => {
    expect(
      gateFailures(
        "Ueda secured the win, and the second goal confirmed the result.",
        toulouseLille,
      ),
    ).toEqual([]);
  });

  it("accepts a sentence opening on an ordinary capitalised word", () => {
    expect(
      gateFailures("Somewhere in the second half the game turned against Toulouse.", toulouseLille),
    ).toEqual([]);
  });
});

describe("prose the gates should still reject", () => {
  it("rejects a number the evidence does not carry", () => {
    const failures = gateFailures("Toulouse had thirty-one shots.", toulouseLille);
    expect(failures.join(" ")).toMatch(/numeric_licence/);
  });

  it("rejects a name the evidence does not carry", () => {
    const failures = gateFailures("Kylian Mbappe decided the match for Lille.", toulouseLille);
    expect(failures.join(" ")).toMatch(/entity_licence/);
  });

  it("rejects a season-level consequence", () => {
    const failures = gateFailures("That result pushes Toulouse towards relegation.", toulouseLille);
    expect(failures.join(" ")).toMatch(/consequence_licence/);
  });

  it("rejects film-specific tactical claims", () => {
    const failures = gateFailures(
      "Lille changed their pressing shape after the hour.",
      toulouseLille,
    );
    expect(failures.join(" ")).toMatch(/unsupported_tactics/);
  });
});

/** Four of six pundits on 2026-09-04 were refused for naming a team the pack
 *  had just handed them, and two more for the eighteen-yard box. Both are the
 *  gate refusing its own evidence rather than catching an invention. */
describe("names and numbers the pack itself supplies", () => {
  const withForm: StructuredMatchInput = {
    ...barcelonaRayo,
    form: {
      home: [
        {
          date: "2026-08-30T14:00:00Z",
          opponent: "Manchester United",
          venue: "away",
          goalsFor: 2,
          goalsAgainst: 5,
        },
      ],
      away: [
        {
          date: "2026-08-29T14:00:00Z",
          opponent: "Nottingham Forest",
          venue: "home",
          goalsFor: 2,
          goalsAgainst: 2,
        },
        {
          date: "2026-08-23T14:00:00Z",
          opponent: "Newcastle",
          venue: "away",
          goalsFor: 2,
          goalsAgainst: 2,
        },
      ],
    },
  } as StructuredMatchInput;

  it("licenses an opponent the pack names only in a label", () => {
    // The pack was trimmed so the form label carries the opponent and the value
    // carries the date and score. Licensing read values alone, so the writer was
    // shown a name and then failed for using it.
    const failures = gateFailures(
      "They arrived having drawn with Nottingham Forest and at Newcastle, while the hosts were beaten at Manchester United.",
      withForm,
    );
    expect(failures.join(" ")).not.toMatch(/entity_licence/);
  });

  it("still refuses a team the pack never mentions", () => {
    const failures = gateFailures("This was nothing like their night against Real Madrid.", withForm);
    expect(failures.join(" ")).toMatch(/entity_licence/);
  });

  it("allows the eighteen-yard box, which is a place and not a claim", () => {
    for (const sentence of [
      "They kept arriving at the edge of the eighteen-yard box without ever shooting.",
      "The deficit got bodies into the eighteen-yard area and left them there.",
    ]) {
      expect(gateFailures(sentence, barcelonaRayo).join(" "), sentence).not.toMatch(/numeric_licence/);
    }
  });

  it("still refuses a distance the evidence does not record", () => {
    const failures = gateFailures("A shot from thirty yards flattered the shot chart.", barcelonaRayo);
    expect(failures.join(" ")).toMatch(/numeric_licence/);
  });
});
