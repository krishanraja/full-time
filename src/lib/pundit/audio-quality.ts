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

/** The loudness range below which a narration is a machine reading a page.
 *
 *  This gate exists to separate two populations that have both been measured
 *  on real narrations, and the number belongs between them rather than above
 *  both:
 *
 *    untagged delivery    1.9 LU (the live episode), 2.1 LU (2026-09-20)
 *    v3 with placed tags  2.7 to 3.4 LU
 *
 *  It was 3, which sits ABOVE the midpoint of the tagged range - so the best
 *  delivery the system has ever produced failed this gate about half the time,
 *  and a run could do everything right and still be refused on a coin toss.
 *  On 2026-09-20 a script that passed all twenty-five editorial harnesses was
 *  quarantined by exactly that.
 *
 *  2.5 separates the two populations instead of cutting through one of them.
 *  It still refuses both measured untagged readings, which is the failure this
 *  gate was built to catch, and it stops refusing the thing the module was
 *  built to produce.
 *
 *  Raise it when tagged delivery is measured consistently higher - the fix
 *  shipped alongside this scales tag placement with length and should move
 *  that range up - and raise it from measurements, not from aspiration. That
 *  is the mistake being corrected here. */
export const MIN_DYNAMIC_RANGE_DB = 2.5;

export function evaluateAudioQuality(metrics: AudioQualityMetrics) {
  const failures: string[] = [];
  if (Math.abs(metrics.integratedLufs - -16) > 1) failures.push("Loudness must be -16 LUFS +/-1.");
  if (metrics.truePeakDb > -1) failures.push("True peak must not exceed -1 dBTP.");
  if (metrics.speakingRateWpm < 110 || metrics.speakingRateWpm > 190) {
    failures.push("Speaking rate falls outside the full-length listenability range.");
  }
  if (metrics.pauseVariationMs < 80) failures.push("Pause distribution is too uniform.");
  if (metrics.dynamicRangeDb < MIN_DYNAMIC_RANGE_DB) {
    failures.push("Delivery dynamic range is too narrow.");
  }
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
