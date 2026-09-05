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
