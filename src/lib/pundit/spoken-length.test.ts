import { expect, it } from "vitest";
import { runHardGates } from "./harness";
import type { EvidencePack, PunditVariantCandidate } from "./types";
import { spokenWordRange } from "./spoken-length";

it("admits a concise Reporter without shortening the other personas", () => {
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
  expect(length("zen", 570)).toBe(true);
  expect(length("zen", 549)).toBe(false);
  expect(length("zen", 801)).toBe(false);
  expect(length("gaffer", 570)).toBe(false);
  expect(length("gaffer", 750)).toBe(true);
  expect(spokenWordRange("zen")).toEqual({ min: 550, max: 800 });
});
