import { describe, expect, it } from "vitest";
import { PUNDIT_SPECS } from "./specs";
import { PUNDIT_IDS } from "./types";

describe("six complete pundit specifications", () => {
  it("defines every persona with launch floors and a separate voice", () => {
    expect(Object.keys(PUNDIT_SPECS).sort()).toEqual([...PUNDIT_IDS].sort());
    const voices = new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].voiceEnvKey));
    expect(voices.size).toBe(6);
    for (const id of PUNDIT_IDS) {
      const spec = PUNDIT_SPECS[id];
      expect(spec.requiredThresholds.insight).toBe(4);
      expect(spec.requiredThresholds.humour).toBe(3);
      expect(spec.positiveExamples.length).toBeGreaterThan(0);
      expect(spec.antiExamples.length).toBeGreaterThan(0);
      expect(spec.prohibitedHumourTargets).toContain("personal humiliation");
    }
  });

  it("does not collapse the personas into the same lens or humour", () => {
    expect(new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].lens)).size).toBe(6);
    expect(new Set(PUNDIT_IDS.map((id) => PUNDIT_SPECS[id].sentenceCadence)).size).toBe(6);
  });
});
