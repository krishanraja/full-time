import { expect, it } from "vitest";
import { runHardGates } from "./harness";
import type { EvidencePack, PunditVariantCandidate } from "./types";
import { PUNDIT_IDS } from "./types";
import { spokenWordRange, spokenDurationRange } from "./spoken-length";

it("enforces alpha word boundaries for every pundit", () => {
  const candidate = {
    punditId: "zen",
    specVersion: 1,
    thesis: {
      punditId: "zen",
      headline: "",
      judgment: "",
      selectedClaimIds: [],
      rejectedClaimIds: [],
      counterpoint: "",
      changeMyMind: "",
    },
    outline: {},
    displayScript: Array(570).fill("football").join(" "),
    spokenScript: "",
    performancePlan: [],
    claimIds: [],
  } as unknown as PunditVariantCandidate;
  const pack = { facts: [], derivations: [], unavailableEvidence: [] } as unknown as EvidencePack;
  const length = (punditId: PunditVariantCandidate["punditId"], words: number) =>
    runHardGates({
      candidate: { ...candidate, punditId, displayScript: Array(words).fill("football").join(" ") },
      pack,
      claims: [],
    }).find((row) => row.harness === "spoken_length")?.passed;
  for (const id of PUNDIT_IDS) {
    const expected = id === "zen" ? { min: 420, max: 500 } : { min: 330, max: 450 };
    expect(spokenWordRange(id)).toEqual(expected);
    expect(spokenDurationRange(id)).toEqual({ min: 120, max: 180 });
    expect(length(id, expected.min)).toBe(true);
    expect(length(id, expected.max)).toBe(true);
    expect(length(id, expected.min - 1)).toBe(false);
    expect(length(id, expected.max + 1)).toBe(false);
    expect(length(id, 750)).toBe(false);
  }
  expect(length("gaffer", 352)).toBe(true);
  expect(spokenDurationRange()).toEqual({ min: 120, max: 180 });
});
