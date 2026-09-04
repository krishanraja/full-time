import { describe, expect, it } from "vitest";
import { countVerifiedProperNames, normalize } from "./pronunciation.server";

const entities = ["Erling Haaland", "Bukayo Saka", "Manchester City", "Ødegaard", "Arsenal"];

describe("transcript-based proper-name verification", () => {
  it("counts every entity the transcript clearly contains", () => {
    const transcript =
      "Erling Haaland scored twice for Manchester City while Bukayo Saka and Odegaard answered for Arsenal.";
    expect(countVerifiedProperNames(entities, transcript)).toBe(5);
  });

  it("tolerates a single-character speech-to-text slip on longer names", () => {
    const transcript = "Erling Haland and Bukayo Sakka met Manchester City. Odegard led Arsenal.";
    expect(countVerifiedProperNames(entities, transcript)).toBe(5);
  });

  it("does not credit names the transcript never spoke", () => {
    const transcript = "Manchester City won. Arsenal lost.";
    expect(countVerifiedProperNames(entities, transcript)).toBe(2);
  });

  it("requires exact matches for short tokens", () => {
    expect(countVerifiedProperNames(["Son"], "Sun scored late.")).toBe(0);
    expect(countVerifiedProperNames(["Son"], "Son scored late.")).toBe(1);
  });

  it("normalises diacritics and punctuation", () => {
    expect(normalize("Ødegaard's")).toBe("odegaard s");
  });
});
