import { describe, expect, it } from "vitest";
import { isValidDropId, projectProofCards } from "./editorial-public.server";

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
