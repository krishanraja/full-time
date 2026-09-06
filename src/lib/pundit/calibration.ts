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

/** Why a dimension may or may not be comparable across a pipeline script and a
 *  script from outside it.
 *
 *  - `craft`: general writing quality. Any football writer is attempting this,
 *    so a low score is about the writing and the comparison means something.
 *  - `spec_bound`: graded against a pundit spec the outside writer never saw.
 *  - `format_bound`: something Full Time requires that the outside genre does
 *    not attempt at all. A match report contains no stated likelihood and no
 *    settleable forward call, so scoring it 1 there is the judge being right,
 *    not the bar being wrong.
 *
 *  Only `craft` dimensions carry the comparison. The other two are still scored
 *  and still reported, because hiding them would let the harness quietly choose
 *  which evidence it looks at, but they are kept out of the reading. */
export type ScoreComparability = "craft" | "spec_bound" | "format_bound";

const COMPARABILITY: Partial<Record<QualitativeHarness, ScoreComparability>> = {
  persona: "spec_bound",
  humour: "spec_bound",
  probability: "format_bound",
  prediction_accountability: "format_bound",
};

export function comparabilityOf(harness: string): ScoreComparability {
  return COMPARABILITY[harness as QualitativeHarness] ?? "craft";
}

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
  /** Whether this dimension can carry a comparison across the two kinds of
   *  script. See ScoreComparability. */
  comparability: ScoreComparability;
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
  /** The same mean over the dimensions that carry a comparison. This is the
   *  number to read; meanScore is not, because it mixes in dimensions an
   *  outside script was never attempting. */
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
    comparability: result.hardGate ? "craft" : comparabilityOf(result.harness),
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
      scored
        .filter((item) => item.comparability === "craft")
        .map((item) => item.score as number),
    ),
    hardGatesPassed: input.scores.filter((item) => item.hardGate).every((item) => item.passed),
  };
}

/** What the numbers say, in one line, so the reading does not depend on
 *  whoever is looking at the table that day. */
/** A judge that failed rather than judged. The message is the one judgeOne
 *  writes when the model call itself did not come back. */
function judgeFailed(score: CalibrationScore): boolean {
  return /could not be read|did not return a usable judgement/i.test(score.failure ?? "");
}

export function calibrationVerdict(subjects: readonly CalibrationSubjectResult[]): string {
  // Infrastructure first, before any reading of the numbers. When the judges do
  // not run, every dimension comes back unscored and a table of failures looks
  // exactly like a damning verdict. On 2026-09-06 the Anthropic spend cap
  // rejected all fourteen judges and this function confidently reported that
  // the bar had moved. A run where the judges did not answer says nothing about
  // anything, and it has to say so first.
  const allScores = subjects.flatMap((subject) => subject.scores);
  const errored = allScores.filter(judgeFailed);
  if (errored.length) {
    const reason = errored[0].failure?.replace(/^The \w+ judge (?:could not be read|did not return a usable judgement): /, "") ?? "";
    return `Void: ${errored.length} of ${allScores.length} judges did not run, so nothing here is a verdict on any script. ${reason.slice(0, 240)}`;
  }

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
    (item) => item.comparability === "craft" && !item.hardGate && item.score !== null && !item.passed,
  );
  const named = belowFloor.map((item) => item.harness).join(", ") || "none";

  // The pipeline side is what settles it. An outside script can score low for
  // reasons that are nothing to do with the bar, but a script this pipeline
  // published and approved is the one case where a low score can only mean the
  // judges have moved. Read that first.
  const ours = subjects.filter((subject) => subject.fromPipeline);
  const failing = ours.filter(
    (subject) => subject.scores.filter((item) => !item.passed).length > 0,
  );
  if (ours.length && failing.length === ours.length) {
    const worst = failing[0];
    const missed = worst.scores
      .filter((item) => !item.passed)
      .map((item) => `${item.harness} ${item.score ?? "hard gate"}`)
      .join(", ");
    return `A script this pipeline already approved no longer clears its own bar: ${worst.label} misses ${worst.scores.filter((item) => !item.passed).length} of ${worst.totalCount} (${missed}), craft mean ${worst.meanScoreCraftOnly}. The judges have moved since it was approved. Find what changed in the rubric before reading anything into the outside scores, and before paying for another run.`;
  }

  if (craft < 2.5) {
    return `The best outside script averages ${craft} on the comparable dimensions and misses ${belowFloor.length} of them (${named}), while the pipeline side clears its own bar. Either these two genres are too far apart to compare, or the bar is measuring something other than quality. Read the failure texts before moving a floor: a match report that never states a likelihood is being scored correctly, not harshly.`;
  }
  if (craft < 3.5) {
    return `The best outside script averages ${craft} on the comparable dimensions and misses ${belowFloor.length} of them (${named}). Professional football writing does not clear this bar, so the floors it misses are measuring something other than quality. Move those specific floors before paying for another run.`;
  }
  if (belowFloor.length > 2) {
    return `The best outside script averages ${craft} but still misses ${belowFloor.length} dimensions (${named}). Those specific floors are the miscalibrated ones; the rest of the bar stands.`;
  }
  return `The best outside script averages ${craft} and clears all but ${belowFloor.length} of the comparable dimensions. The bar is real. The gap is in the writer prompt, not in the judges, so work it against this corpus rather than by firing paid runs.`;
}
