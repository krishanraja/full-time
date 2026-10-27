import { describe, expect, it } from "vitest";
import { PUNDIT_IDS } from "./types";
import { evaluateAudioQuality } from "./audio-quality";
import { EVALUATION_SCENARIOS, validateEvaluationManifest } from "./evaluation";

describe("launch evaluation gates", () => {
  it.each([...PUNDIT_IDS])("enforces measured alpha duration and safety for %s", (punditId) => {
    const metrics = {
      integratedLufs: -16,
      truePeakDb: -1.2,
      durationSec: 150,
      speakingRateWpm: punditId === "zen" ? 192 : 150,
      pauseVariationMs: 120,
      dynamicRangeDb: 4,
      properNamesVerified: 10,
      properNamesTotal: 10,
      transcriptVerified: true,
      numbersVerified: true,
      performanceProfileVerified: true,
      clippedWords: false,
      repeatedPhrases: false,
      misplacedEmphasis: false,
      monotone: false,
      overactedPunchlines: false,
      synthesisArtifacts: false,
    };
    expect(evaluateAudioQuality(metrics, punditId).passed).toBe(true);
    for (const durationSec of [120, 180]) {
      expect(evaluateAudioQuality({ ...metrics, durationSec }, punditId).passed).toBe(true);
    }
    for (const durationSec of [119.99, 180.01, 199, 360, NaN, Infinity]) {
      const result = evaluateAudioQuality({ ...metrics, durationSec }, punditId);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain("Narration must run for 2 to 3 minutes.");
    }
    expect(evaluateAudioQuality({ ...metrics, speakingRateWpm: 211 }, punditId).passed).toBe(false);
    expect(evaluateAudioQuality({ ...metrics, numbersVerified: false }, punditId).passed).toBe(
      false,
    );
    expect(
      evaluateAudioQuality({ ...metrics, performanceProfileVerified: false }, punditId).passed,
    ).toBe(false);
    expect(evaluateAudioQuality({ ...metrics, transcriptVerified: false }, punditId).passed).toBe(
      false,
    );
    expect(evaluateAudioQuality({ ...metrics, synthesisArtifacts: true }, punditId).passed).toBe(
      false,
    );
  });
  it("requires exactly 60 matches and produces 360 scripts", () => {
    const matches = Array.from({ length: 60 }, (_, index) => ({
      matchId: `match-${index}`,
      scenarios: [EVALUATION_SCENARIOS[index % EVALUATION_SCENARIOS.length]],
      partition: index < 12 ? ("held_out" as const) : ("gold" as const),
      promptVisible: index >= 12,
    }));
    const result = validateEvaluationManifest(matches);
    expect(result.passed).toBe(true);
    expect(result.expectedScripts).toBe(360);
  });

  it("fails audio closed when verification or performance is weak", () => {
    const result = evaluateAudioQuality({
      integratedLufs: -16,
      truePeakDb: -1.2,
      durationSec: 150,
      speakingRateWpm: 150,
      pauseVariationMs: 120,
      dynamicRangeDb: 4,
      properNamesVerified: 98,
      properNamesTotal: 100,
      transcriptVerified: false,
      numbersVerified: true,
      performanceProfileVerified: true,
      clippedWords: false,
      repeatedPhrases: false,
      misplacedEmphasis: false,
      monotone: false,
      overactedPunchlines: false,
      synthesisArtifacts: false,
    });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Proper-name verification is below 99%.");
    expect(result.failures).toContain("Audio transcript was not verified.");
  });
});
