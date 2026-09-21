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

/** Tag placement has to scale with the length of the read.
 *
 *  Four tags is a delivery change every fourteen seconds on the 55-second
 *  episode this module was written for, and one every ninety-five seconds on
 *  the six-minute format it now serves. The second measured 2.1 LU against a
 *  header that records untagged delivery at 1.9, and quarantined a script that
 *  had passed all twenty-five editorial harnesses. */
describe("delivery tags scale with the length of the script", () => {
  // The shape that produced 2.1 LU: ten beats, 5,060 characters, 382 seconds.
  const longPlan: PerformanceBeat[] = (
    [
      "setup",
      "explanation",
      "explanation",
      "explanation",
      "evidence",
      "verdict",
      "pivot",
      "punchline",
      "prediction",
      "receipt",
    ] as const
  ).map((intent, index) => ({
    text: `Beat ${index} ${"word ".repeat(95)}`.trim(),
    intent,
    pace: "measured" as const,
    energy: 3 as const,
  }));
  const longScript = longPlan.map((beat) => beat.text).join(" ");
  const countTags = (spoken: string) => (spoken.match(/\[/g) || []).length;

  it("places more than the old fixed four on a six-minute read", () => {
    const spoken = applyPerformanceCadence(longScript, "stats", longPlan);
    expect(countTags(spoken)).toBeGreaterThan(4);
  });

  it("stays inside the budget it is allowed, for every pundit", () => {
    for (const pundit of ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as const) {
      const spoken = applyPerformanceCadence(longScript, pundit, longPlan);
      // narrate() throws on this, so a placement change that outgrows the
      // budget stops narration altogether instead of just sounding flat.
      expect(tagBudgetOk(spoken)).toBe(true);
      expect(tagsAllowlisted(spoken)).toBe(true);
      expect(spokenIdentity(spoken, longScript)).toBe(true);
    }
  });

  it("leaves a short script where it was", () => {
    const spoken = applyPerformanceCadence(script, "zen", plan);
    expect(countTags(spoken)).toBeLessThanOrEqual(4);
    expect(tagBudgetOk(spoken)).toBe(true);
  });

  // The rail is a rail. A script that somehow arrived carrying a tag every
  // few words is still refused.
  it("still refuses a runaway", () => {
    expect(tagBudgetOk(`${"[excited] word ".repeat(40)}`)).toBe(false);
  });
});
