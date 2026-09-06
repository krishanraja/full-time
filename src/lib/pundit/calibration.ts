/** Judging the judges.
 *
 *  Twelve scored dimensions decide whether a script publishes, each against a
 *  floor of four out of five. Nobody has ever checked whether that bar is
 *  calibrated to anything. The standards in dimensions.ts were written from
 *  what the judges were already rejecting, which means they record the judges'
 *  opinion rather than a validated standard, and a run that fails five
 *  dimensions across all six pundits is as easily a bar nothing clears as it is
 *  six bad scripts.
 *
 *  This module is the free half of the answer: take scripts whose quality is
 *  already known (one the pipeline published, and professional match writing
 *  about the same game), put them through the identical judges, and read the
 *  scores side by side. A good human recap scoring threes says the bar is
 *  miscalibrated. Scoring fours and fives says the bar is real and the writer
 *  prompt is the gap.
 *
 *  Nothing here writes to the database, produces audio, or repairs anything. */

import type { BeatName, BeatOutline, HarnessResult, PunditId, QualitativeHarness } from "./types";

export const CALIBRATION_BEATS: readonly BeatName[] = [
  "hook",
  "match_story",
  "evidence",
  "explanation",
  "judgment",
  "counterpoint",
  "humour",
  "portable_line",
  "prediction_or_receipt",
  "close",
];

/** Dimensions that grade a script against a pundit spec rather than against
 *  general craft. An outside writer never saw the spec, so a low score here is
 *  a fact about the comparison and not about the writing. They are scored
 *  anyway, and flagged, because hiding them would let the harness quietly
 *  choose which evidence it looks at. */
export const SPEC_BOUND_DIMENSIONS: readonly QualitativeHarness[] = ["persona", "humour"];

/** Prose from outside the pipeline has no beat outline, and the fail-closed
 *  factual judge reads one. Splitting the paragraphs across the ten beat names
 *  in order gives it the whole script in the shape it expects.
 *
 *  This is a container, not a claim about structure: the beat names carry no
 *  meaning for an outside script, and the judge is told so. What matters is
 *  that every sentence reaches the judge exactly once, in order. */
export function beatsFromProse(script: string): BeatOutline {
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = paragraphs.length ? paragraphs : [script.trim()];
  const outline = {} as BeatOutline;
  const per = Math.ceil(chunks.length / CALIBRATION_BEATS.length);
  CALIBRATION_BEATS.forEach((beat, index) => {
    const slice = chunks.slice(index * per, (index + 1) * per).join("\n\n");
    // A short script runs out of paragraphs before it runs out of beat names.
    // An empty string would fail the judge's own input contract, so the tail
    // beats say plainly that there is nothing there.
    outline[beat] = slice || "(no further text)";
  });
  return outline;
}

export type CalibrationScore = {
  harness: string;
  hardGate: boolean;
  score: number | null;
  threshold: number | null;
  passed: boolean;
  /** True where the dimension grades against a pundit spec the writer of an
   *  outside script never saw. */
  specBound: boolean;
  failure?: string;
  evidenceSpan?: string;
};

export type CalibrationSubjectResult = {
  label: string;
  punditId: PunditId;
  /** Whether this script came from the pipeline. */
  fromPipeline: boolean;
  scores: CalibrationScore[];
  passedCount: number;
  totalCount: number;
  /** Mean of the twelve scored dimensions, ignoring the two hard gates, which
   *  are pass or fail and have no score. */
  meanScore: number | null;
  /** The same mean over the ten dimensions that do not depend on a spec. */
  meanScoreCraftOnly: number | null;
  hardGatesPassed: boolean;
};

export function shapeCalibrationScores(
  results: readonly HarnessResult[],
  thresholds: Partial<Record<QualitativeHarness, number>>,
): CalibrationScore[] {
  return results.map((result) => ({
    harness: result.harness,
    hardGate: result.hardGate,
    score: result.score ?? null,
    threshold: result.hardGate ? null : (thresholds[result.harness as QualitativeHarness] ?? null),
    passed: result.passed,
    specBound: SPEC_BOUND_DIMENSIONS.includes(result.harness as QualitativeHarness),
    failure: result.failure,
    evidenceSpan: result.evidenceSpan,
  }));
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function summariseSubject(input: {
  label: string;
  punditId: PunditId;
  fromPipeline: boolean;
  scores: CalibrationScore[];
}): CalibrationSubjectResult {
  const scored = input.scores.filter((item) => !item.hardGate && item.score !== null);
  return {
    ...input,
    passedCount: input.scores.filter((item) => item.passed).length,
    totalCount: input.scores.length,
    meanScore: mean(scored.map((item) => item.score as number)),
    meanScoreCraftOnly: mean(
      scored.filter((item) => !item.specBound).map((item) => item.score as number),
    ),
    hardGatesPassed: input.scores.filter((item) => item.hardGate).every((item) => item.passed),
  };
}

/** What the numbers say, in one line, so the reading does not depend on
 *  whoever is looking at the table that day. */
export function calibrationVerdict(subjects: readonly CalibrationSubjectResult[]): string {
  const outside = subjects.filter((subject) => !subject.fromPipeline);
  if (!outside.length) {
    return "No outside script was scored, so this run says nothing about whether the bar is calibrated. Add a professional recap of the same match.";
  }
  const best = outside.reduce((top, subject) =>
    (subject.meanScoreCraftOnly ?? 0) > (top.meanScoreCraftOnly ?? 0) ? subject : top,
  );
  const craft = best.meanScoreCraftOnly;
  if (craft === null) {
    return "No outside script returned a readable score. The judges failed rather than the writing, so this run is void.";
  }
  const belowFloor = best.scores.filter(
    (item) => !item.hardGate && !item.specBound && item.score !== null && !item.passed,
  );
  if (craft < 3.5) {
    return `The best outside script averages ${craft} on the ten craft dimensions and misses ${belowFloor.length} of them (${belowFloor.map((item) => item.harness).join(", ") || "none"}). Professional football writing does not clear this bar, so the bar is measuring something other than quality. Move the floors before paying for another run.`;
  }
  if (belowFloor.length > 2) {
    return `The best outside script averages ${craft} but still misses ${belowFloor.length} dimensions (${belowFloor.map((item) => item.harness).join(", ")}). Those specific floors are the miscalibrated ones; the rest of the bar stands.`;
  }
  return `The best outside script averages ${craft} and clears all but ${belowFloor.length} of the craft dimensions. The bar is real. The gap is in the writer prompt, not in the judges, so work it against this corpus rather than by firing paid runs.`;
}
