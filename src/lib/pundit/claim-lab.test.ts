import { describe, expect, it } from "vitest";
import { licenseClaim } from "./claim-lab";
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
