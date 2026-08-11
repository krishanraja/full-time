export type AudioQualityMetrics = {
  integratedLufs: number;
  truePeakDb: number;
  speakingRateWpm: number;
  pauseVariationMs: number;
  dynamicRangeDb: number;
  durationSec: number;
  properNamesVerified: number;
  properNamesTotal: number;
  transcriptVerified: boolean;
  numbersVerified: boolean;
  performanceProfileVerified: boolean;
  clippedWords: boolean;
  repeatedPhrases: boolean;
  misplacedEmphasis: boolean;
  monotone: boolean;
  overactedPunchlines: boolean;
  synthesisArtifacts: boolean;
};

export function evaluateAudioQuality(metrics: AudioQualityMetrics) {
  const failures: string[] = [];
  if (Math.abs(metrics.integratedLufs - -16) > 1) failures.push("Loudness must be -16 LUFS +/-1.");
  if (metrics.truePeakDb > -1) failures.push("True peak must not exceed -1 dBTP.");
  if (metrics.speakingRateWpm < 110 || metrics.speakingRateWpm > 190) {
    failures.push("Speaking rate falls outside the full-length listenability range.");
  }
  if (metrics.pauseVariationMs < 80) failures.push("Pause distribution is too uniform.");
  if (metrics.dynamicRangeDb < 3) failures.push("Delivery dynamic range is too narrow.");
  if (metrics.durationSec < 300 || metrics.durationSec > 480) {
    failures.push("Narration must run for five to eight minutes.");
  }
  const pronunciationRate =
    metrics.properNamesTotal === 0 ? 1 : metrics.properNamesVerified / metrics.properNamesTotal;
  if (pronunciationRate < 0.99) failures.push("Proper-name verification is below 99%.");
  if (!metrics.transcriptVerified) failures.push("Audio transcript was not verified.");
  if (!metrics.numbersVerified) failures.push("Audio numbers do not match the approved script.");
  if (!metrics.performanceProfileVerified) {
    failures.push("The selected voice has not passed a full-length performance review.");
  }
  for (const [failed, message] of [
    [metrics.clippedWords, "Audio contains clipped words."],
    [metrics.repeatedPhrases, "Audio contains repeated phrases."],
    [metrics.misplacedEmphasis, "Audio contains misplaced emphasis."],
    [metrics.monotone, "Delivery is systematically monotone."],
    [metrics.overactedPunchlines, "Punchline delivery is overacted."],
    [metrics.synthesisArtifacts, "Audio contains synthesis artifacts."],
  ] as const) {
    if (failed) failures.push(message);
  }
  return { passed: failures.length === 0, failures, pronunciationRate };
}
