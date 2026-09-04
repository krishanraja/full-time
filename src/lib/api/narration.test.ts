import { describe, expect, it } from "vitest";
import {
  applyPerformanceCadence,
  chunkSpokenForTts,
  fidelityNumbers,
  monthlyCapacityFloor,
  quotaShouldStop,
  spokenIdentity,
  stripTags,
  tagBudgetOk,
  tagsAllowlisted,
} from "./narration.server";
import type { PerformanceBeat } from "@/lib/pundit/types";

const script = "North FC had 15 shots. The result was 1-2. That is the warning.";
const plan: PerformanceBeat[] = [
  { text: "North FC had 15 shots.", intent: "evidence", pace: "measured", energy: 3 },
  { text: "The result was 1-2.", intent: "verdict", pace: "slow", energy: 3, pauseBeforeMs: 350 },
  { text: "That is the warning.", intent: "punchline", pace: "brisk", energy: 4 },
];

describe("persona narration plans", () => {
  it("changes delivery without changing approved words", () => {
    for (const pundit of ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as const) {
      const spoken = applyPerformanceCadence(script, pundit, plan);
      expect(tagsAllowlisted(spoken)).toBe(true);
      expect(tagBudgetOk(spoken)).toBe(true);
      expect(spokenIdentity(spoken, script)).toBe(true);
      expect(stripTags(spoken)).not.toContain("[");
    }
  });

  it("rejects a performance plan that rewrites the script", () => {
    expect(() =>
      applyPerformanceCadence(script, "zen", [{ ...plan[0], text: "Different words." }]),
    ).toThrow(/changes the approved script/i);
  });

  it("checks spoken numbers in order", () => {
    expect(fidelityNumbers("North had fifteen shots and lost one two.", script)).toBe(true);
    expect(fidelityNumbers("North had five shots and lost one two.", script)).toBe(false);
  });

  it("splits full-length narration below the provider limit at safe boundaries", () => {
    const long = Array.from(
      { length: 100 },
      (_, index) => `[thoughtful] Sentence ${index} contains enough approved words to test chunking.`,
    ).join(" ");
    const chunks = chunkSpokenForTts(long, 800);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 800)).toBe(true);
    expect(chunks.join(" ")).toBe(long);
  });
});

describe("narration capacity gate", () => {
  it("reads an optional monthly floor from the environment", () => {
    expect(monthlyCapacityFloor({})).toBe(0);
    expect(monthlyCapacityFloor({ TTS_MONTHLY_CHARACTER_CAPACITY: "0" })).toBe(0);
    expect(monthlyCapacityFloor({ TTS_MONTHLY_CHARACTER_CAPACITY: "abc" })).toBe(0);
    expect(monthlyCapacityFloor({ TTS_MONTHLY_CHARACTER_CAPACITY: "1500000" })).toBe(1_500_000);
  });

  it("allows a small plan that can still afford three takes", () => {
    const result = quotaShouldStop({
      used: 10_000,
      limit: 100_000,
      requestedCharacters: 6_000,
      floor: 0,
    });
    expect(result.stop).toBe(false);
    expect(result.remaining).toBe(90_000);
  });

  it("stops when the retry reserve or the configured floor is not met", () => {
    expect(
      quotaShouldStop({ used: 95_000, limit: 100_000, requestedCharacters: 6_000, floor: 0 }).stop,
    ).toBe(true);
    expect(
      quotaShouldStop({ used: 0, limit: 100_000, requestedCharacters: 6_000, floor: 1_500_000 })
        .stop,
    ).toBe(true);
  });
});
