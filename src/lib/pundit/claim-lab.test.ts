import { describe, expect, it } from "vitest";
import { dedupeClaims, licenseClaim } from "./claim-lab";
import type { AnalysisClaim, EvidencePack } from "./types";

const pack = {
  id: "pack-1",
  matchId: "match-1",
  version: 1,
  facts: [
    { id: "stats.home_shots", kind: "fact", label: "Home shots", value: 26 },
    { id: "event.a", kind: "fact", label: "Sub", value: [68, null, "Chelsea", "James"] },
    { id: "event.b", kind: "fact", label: "Sub", value: [68, null, "Chelsea", "Acheampong"] },
    { id: "event.c", kind: "fact", label: "Sub", value: [68, null, "Chelsea", "Caicedo"] },
    { id: "event.d", kind: "fact", label: "Sub", value: [72, null, "Chelsea", "Chavarria"] },
    { id: "event.e", kind: "fact", label: "Sub", value: [82, null, "Chelsea", "Barco"] },
  ],
  derivations: [],
  unavailableEvidence: [],
} as unknown as EvidencePack;

const claim = (over: Partial<AnalysisClaim>): AnalysisClaim =>
  ({
    id: "claim-1",
    matchId: "match-1",
    type: "fact",
    thesis: "",
    evidenceRefs: [],
    confidence: 0.9,
    ...over,
  }) as AnalysisClaim;

describe("a claim must count its own evidence correctly", () => {
  it("rejects a thesis that states a count its citations contradict", () => {
    const result = licenseClaim(
      claim({
        thesis:
          "Chelsea made four substitutions (James, Acheampong, Caicedo at 68'; Chavarria at 72'; Barco at 82').",
        evidenceRefs: ["event.a", "event.b", "event.c", "event.d", "event.e"],
      }),
      pack,
    );
    expect(result.licensed).toBe(false);
    expect(result.failures.join(" ")).toMatch(/four/);
  });

  it("accepts the same thesis once the count matches the citations", () => {
    const result = licenseClaim(
      claim({
        thesis:
          "Chelsea made five substitutions (James, Acheampong, Caicedo at 68'; Chavarria at 72'; Barco at 82').",
        evidenceRefs: ["event.a", "event.b", "event.c", "event.d", "event.e"],
      }),
      pack,
    );
    expect(result.licensed).toBe(true);
  });

  it("accepts a number the cited evidence carries as a value", () => {
    const result = licenseClaim(
      claim({ thesis: "Chelsea took 26 shots.", evidenceRefs: ["stats.home_shots"] }),
      pack,
    );
    expect(result.licensed).toBe(true);
  });

  it("rejects a number that appears nowhere in the cited evidence", () => {
    const result = licenseClaim(
      claim({ thesis: "Chelsea took 31 shots.", evidenceRefs: ["stats.home_shots"] }),
      pack,
    );
    expect(result.licensed).toBe(false);
  });

  it("leaves a claim with no numbers alone", () => {
    const result = licenseClaim(
      claim({ thesis: "Chelsea changed the game from the bench.", evidenceRefs: ["event.a"] }),
      pack,
    );
    expect(result.licensed).toBe(true);
  });
});

// The second claim to poison a whole show, on 2026-09-04. Every number in it
// was individually accountable: "four" read as the number of citations, "one"
// as an ordinary football constant. It still named three men for four cards and
// needed five cited events to compare four with one. All six pundits built a
// humour beat on it and all six were rejected against the evidence.
const cards = {
  id: "pack-2",
  matchId: "match-1",
  version: 1,
  facts: [
    { id: "event.y1", kind: "fact", label: "Yellow", value: [10, null, "Liverpool", "Mac Allister"] },
    { id: "event.y2", kind: "fact", label: "Yellow", value: [52, null, "Liverpool", "Jacquet"] },
    { id: "event.y3", kind: "fact", label: "Yellow", value: [57, null, "Liverpool", "Kerkez"] },
    { id: "event.y4", kind: "fact", label: "Yellow", value: [41, null, "Ipswich", "Enciso"] },
    { id: "stats.home_shots", kind: "fact", label: "Home shots", value: 21 },
    { id: "stats.away_shots", kind: "fact", label: "Away shots", value: 9 },
  ],
  derivations: [],
  unavailableEvidence: [],
} as unknown as EvidencePack;

const yellows = ["event.y1", "event.y2", "event.y3", "event.y4"];

describe("a count that names its members", () => {
  it("rejects a count that names fewer men than it counts", () => {
    const result = licenseClaim(
      claim({
        thesis:
          "Liverpool received four yellow cards (Mac Allister, Jacquet, Kerkez) versus Ipswich's one (Enciso).",
        evidenceRefs: yellows,
      }),
      cards,
    );
    expect(result.licensed).toBe(false);
    expect(result.failures.join(" ")).toMatch(/names 3/);
  });

  it("accepts the same claim written honestly", () => {
    const result = licenseClaim(
      claim({
        thesis:
          "Liverpool received three yellow cards (Mac Allister, Jacquet, Kerkez) versus Ipswich's one (Enciso).",
        evidenceRefs: yellows,
      }),
      cards,
    );
    expect(result.licensed).toBe(true);
  });

  it("rejects a comparison that needs more citations than it has", () => {
    const result = licenseClaim(
      claim({
        thesis: "Liverpool received four yellow cards versus Ipswich's one.",
        evidenceRefs: yellows,
      }),
      cards,
    );
    expect(result.licensed).toBe(false);
    expect(result.failures.join(" ")).toMatch(/needs 5 cited items/);
  });

  it("accepts a comparison the citations cover", () => {
    const result = licenseClaim(
      claim({
        thesis: "Liverpool received three yellow cards versus Ipswich's one.",
        evidenceRefs: yellows,
      }),
      cards,
    );
    expect(result.licensed).toBe(true);
  });

  // The rules must not fire on ordinary prose. A parenthetical that is not a
  // roster, a minute rather than a count, and a comparison of two figures the
  // evidence itself carries.
  it("leaves a scoreline, a minute and a stated statistic alone", () => {
    for (const thesis of [
      "Liverpool won it late (2-1) after an hour of pressure.",
      "The opener arrived in the tenth minute (Mac Allister).",
      "Liverpool took 21 shots versus Ipswich's 9.",
    ]) {
      const result = licenseClaim(
        claim({ thesis, evidenceRefs: ["event.y1", "stats.home_shots", "stats.away_shots"] }),
        cards,
      );
      expect(result.failures.join(" "), thesis).not.toMatch(/but names|Compares/);
    }
  });
});

/** Built from the claim set the laboratory actually returned for Liverpool at
 *  Ipswich on 2026-09-04. Thirty-five claims, twenty-seven of them facts, the
 *  same five or six ideas restated. Six pundits then wrote one script from the
 *  one mechanism available and five of six were failed for a truism, and for
 *  restraint on top, because a writer that selects three claims which are one
 *  claim writes that claim three times. */
describe("collapsing a claim set that says one thing many times", () => {
  const c = (over: Partial<AnalysisClaim>): AnalysisClaim => ({
    id: over.id ?? "id-" + Math.random(),
    matchId: "match-1",
    type: "fact",
    thesis: "",
    evidenceRefs: ["stats.home_shots"],
    confidence: 0.9,
    ...over,
  });

  it("keeps one of three claims that state the same possession figure", () => {
    const kept = dedupeClaims([
      c({ id: "a", thesis: "Liverpool held the majority of possession at 55% to Ipswich's 45%." }),
      c({ id: "b", thesis: "Liverpool held 55% possession to Ipswich's 45%.", confidence: 0.8 }),
      c({ id: "c", thesis: "Liverpool held marginally more possession (55% to 45%).", confidence: 0.7 }),
    ]);
    expect(kept).toHaveLength(1);
  });

  it("collapses two claims that cite exactly the same evidence", () => {
    const kept = dedupeClaims([
      c({ id: "a", thesis: "The final score is corroborated by agreeing independent feeds.", evidenceRefs: ["context.feeds"] }),
      c({ id: "b", thesis: "Independent score feeds agree on the recorded result.", evidenceRefs: ["context.feeds"], confidence: 0.5 }),
    ]);
    expect(kept.map((claim) => claim.id)).toEqual(["a"]);
  });

  it("keeps the most confident, best evidenced version of a duplicate", () => {
    const kept = dedupeClaims([
      c({ id: "thin", thesis: "Isak scored both Liverpool goals.", confidence: 0.6, evidenceRefs: ["event.g1"] }),
      c({
        id: "rich",
        thesis: "Isak scored both Liverpool goals in the 6th and 9th minutes.",
        confidence: 0.95,
        evidenceRefs: ["event.g1", "event.g2"],
      }),
    ]);
    expect(kept.map((claim) => claim.id)).toEqual(["rich"]);
  });

  it("caps the facts that only restate the pack, and keeps every analysis", () => {
    // Twelve facts with nothing in common but the fixture, so the cap is what
    // trims them rather than the duplicate rule.
    const facts = [
      "Isak scored twice inside the opening nine minutes.",
      "Ipswich registered fourteen efforts across the ninety.",
      "Both goalkeepers made five saves.",
      "Liverpool collected four yellow cards.",
      "Possession finished fifty five to forty five.",
      "Corners went four to three toward the hosts.",
      "A video review occurred around the hour mark.",
      "Szoboszlai was withdrawn late on.",
      "Independent feeds corroborate the recorded scoreline.",
      "Kerkez was booked protecting the advantage.",
      "The visitors travelled having drawn their previous fixture.",
      "Mac Allister departed with six minutes remaining.",
    ].map((thesis, index) => c({ id: "f" + index, thesis, evidenceRefs: ["e" + index] }));
    const analysis: AnalysisClaim[] = [
      c({ id: "m1", type: "mechanism", thesis: "Ipswich shot from range and it produced nothing.", evidenceRefs: ["m-a"] }),
      c({ id: "m2", type: "mechanism", thesis: "Liverpool scored twice inside nine minutes and defended a lead.", evidenceRefs: ["m-b"] }),
      c({ id: "o1", type: "opinion", thesis: "Isak's brace was the decisive feature of the night.", evidenceRefs: ["o-a"] }),
      c({ id: "d1", type: "decision_quality", thesis: "Ipswich generated enough volume to threaten without quality.", evidenceRefs: ["d-a"] }),
    ];
    const kept = dedupeClaims([...facts, ...analysis]);
    expect(kept.filter((claim) => claim.type === "fact")).toHaveLength(8);
    // Nothing analytical is ever dropped for being over a cap.
    for (const id of ["m1", "m2", "o1", "d1"]) {
      expect(kept.map((claim) => claim.id), id).toContain(id);
    }
  });

  it("leaves genuinely different analyses alone", () => {
    const kept = dedupeClaims([
      c({ id: "shots", type: "mechanism", thesis: "Ipswich took ten of fourteen shots from outside the box.", evidenceRefs: ["a"] }),
      c({ id: "timing", type: "mechanism", thesis: "Liverpool led inside nine minutes and spent eighty one defending it.", evidenceRefs: ["b"] }),
      c({ id: "cards", type: "mechanism", thesis: "Liverpool took four yellow cards protecting the lead.", evidenceRefs: ["c"] }),
    ]);
    expect(kept).toHaveLength(3);
  });

  it("returns claims in the order the laboratory produced them", () => {
    const kept = dedupeClaims([
      c({ id: "first", type: "mechanism", thesis: "Alpha bravo charlie delta echo foxtrot.", evidenceRefs: ["a"] }),
      c({ id: "second", type: "opinion", thesis: "Golf hotel india juliet kilo lima.", evidenceRefs: ["b"], confidence: 0.99 }),
    ]);
    expect(kept.map((claim) => claim.id)).toEqual(["first", "second"]);
  });
});
