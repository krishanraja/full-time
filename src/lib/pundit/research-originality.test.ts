import { describe, expect, it } from "vitest";
import { maxSourceSimilarity, sourceSimilarity } from "./research-originality";
import { extractSourceLanguageSpans } from "./research-originality.server";

describe("research corpus originality", () => {
  it("blocks a copied source-language run", () => {
    const source =
      "the midfield kept stepping forward while the space behind it became the real story of the match";
    const script = `A fresh opening. ${source}. A separate closing judgment.`;
    expect(sourceSimilarity(script, source)).toBeGreaterThanOrEqual(0.82);
  });

  it("does not punish an original discussion of the same abstract concept", () => {
    const source =
      "the midfield kept stepping forward while the space behind it became the real story of the match";
    const script =
      "Their territorial ambition created a measurable trade-off, but the structured data cannot tell us which instruction caused it.";
    expect(maxSourceSimilarity(script, [source])).toBeLessThan(0.82);
  });

  it("extracts only explicitly rights-approved source language", () => {
    expect(
      extractSourceLanguageSpans({
        summary: "an internal paraphrase",
        sourceLanguageSpans: ["licensed source wording for overlap verification"],
      }),
    ).toEqual(["licensed source wording for overlap verification"]);
  });
});
