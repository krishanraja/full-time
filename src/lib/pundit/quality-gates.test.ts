import { describe, expect, it } from "vitest";
import { evaluateAudioQuality } from "./audio-quality";
import { EVALUATION_SCENARIOS, validateEvaluationManifest } from "./evaluation";

describe("launch evaluation gates", () => {
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
      durationSec: 360,
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
