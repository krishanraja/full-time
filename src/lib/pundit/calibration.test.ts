import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  beatsFromProse,
  calibrationVerdict,
  CALIBRATION_BEATS,
  shapeCalibrationScores,
  SPEC_BOUND_DIMENSIONS,
  summariseSubject,
  type CalibrationScore,
} from "./calibration";
import { buildEvidencePack, type StructuredMatchInput } from "./evidence";
import { onOwnMeter, resetSpend, spentThisStepUsd } from "./model-cost";
import { generateClaimLaboratory, judgeCandidate } from "./pundit-generator.server";
import { getPunditSpec } from "./specs";
import type { HarnessResult } from "./types";

function score(over: Partial<CalibrationScore>): CalibrationScore {
  return {
    harness: "insight",
    hardGate: false,
    score: 4,
    threshold: 4,
    passed: true,
    specBound: false,
    ...over,
  };
}

describe("splitting outside prose into the beats the factual judge reads", () => {
  it("gives every beat name a value and loses no text", () => {
    const script = Array.from({ length: 10 }, (_, index) => `Paragraph ${index} text.`).join(
      "\n\n",
    );
    const outline = beatsFromProse(script);
    expect(Object.keys(outline).sort()).toEqual([...CALIBRATION_BEATS].sort());
    const rejoined = CALIBRATION_BEATS.map((beat) => outline[beat]).join("\n\n");
    for (let index = 0; index < 10; index++) {
      expect(rejoined).toContain(`Paragraph ${index} text.`);
    }
  });

  it("keeps the paragraph order across the beats", () => {
    const script = ["First.", "Second.", "Third."].join("\n\n");
    const outline = beatsFromProse(script);
    const joined = CALIBRATION_BEATS.map((beat) => outline[beat]).join(" ");
    expect(joined.indexOf("First.")).toBeLessThan(joined.indexOf("Second."));
    expect(joined.indexOf("Second.")).toBeLessThan(joined.indexOf("Third."));
  });

  it("never leaves a beat empty, however short the script", () => {
    const outline = beatsFromProse("One sentence and no paragraph breaks at all.");
    for (const beat of CALIBRATION_BEATS) {
      expect(outline[beat].length, beat).toBeGreaterThan(0);
    }
    expect(outline.hook).toContain("One sentence");
  });
});

describe("shaping a judged result into a calibration reading", () => {
  const thresholds = getPunditSpec("romantic").requiredThresholds;

  it("carries each dimension's own floor, and none for a hard gate", () => {
    const results: HarnessResult[] = [
      { harness: "factual_entailment", hardGate: true, passed: true },
      { harness: "insight", hardGate: false, passed: true, score: 4 },
      { harness: "humour", hardGate: false, passed: false, score: 2, failure: "flat" },
    ];
    const shaped = shapeCalibrationScores(results, thresholds);
    expect(shaped[0].threshold).toBeNull();
    expect(shaped[1].threshold).toBe(thresholds.insight);
    expect(shaped[2].threshold).toBe(thresholds.humour);
    expect(shaped[2].failure).toBe("flat");
  });

  it("flags the dimensions that grade against a spec an outside writer never saw", () => {
    const results: HarnessResult[] = [
      ...SPEC_BOUND_DIMENSIONS.map((harness) => ({
        harness,
        hardGate: false,
        passed: false,
        score: 1 as const,
      })),
      { harness: "insight", hardGate: false, passed: true, score: 5 },
    ];
    const shaped = shapeCalibrationScores(results, thresholds);
    expect(shaped.filter((item) => item.specBound).map((item) => item.harness)).toEqual([
      ...SPEC_BOUND_DIMENSIONS,
    ]);
    expect(shaped.find((item) => item.harness === "insight")?.specBound).toBe(false);
  });

  it("averages the craft dimensions separately from the spec-bound ones", () => {
    const summary = summariseSubject({
      label: "outside",
      punditId: "romantic",
      fromPipeline: false,
      scores: [
        score({ harness: "factual_entailment", hardGate: true, score: null, threshold: null }),
        score({ harness: "insight", score: 5 }),
        score({ harness: "clarity", score: 5 }),
        score({ harness: "persona", score: 1, specBound: true, passed: false }),
      ],
    });
    // The two fives are the craft reading. Persona drags the overall mean down
    // for a reason that says nothing about the writing.
    expect(summary.meanScoreCraftOnly).toBe(5);
    expect(summary.meanScore).toBeCloseTo(3.67, 2);
    expect(summary.hardGatesPassed).toBe(true);
    expect(summary.passedCount).toBe(3);
    expect(summary.totalCount).toBe(4);
  });
});

describe("what the reading means", () => {
  const outside = (scores: CalibrationScore[]) =>
    summariseSubject({ label: "recap", punditId: "romantic", fromPipeline: false, scores });

  it("refuses to conclude anything without an outside script", () => {
    const verdict = calibrationVerdict([
      summariseSubject({
        label: "ours",
        punditId: "romantic",
        fromPipeline: true,
        scores: [score({})],
      }),
    ]);
    expect(verdict).toContain("says nothing");
  });

  it("calls the bar miscalibrated when professional writing cannot clear it", () => {
    const verdict = calibrationVerdict([
      outside([
        score({ harness: "insight", score: 3, passed: false }),
        score({ harness: "clarity", score: 3, passed: false }),
        score({ harness: "judgment", score: 3, passed: false }),
      ]),
    ]);
    expect(verdict).toContain("does not clear this bar");
    expect(verdict).toContain("Move the floors");
  });

  it("names the specific floors when most of the bar stands", () => {
    const verdict = calibrationVerdict([
      outside([
        score({ harness: "insight", score: 5 }),
        score({ harness: "clarity", score: 5 }),
        score({ harness: "judgment", score: 5 }),
        score({ harness: "probability", score: 2, passed: false }),
        score({ harness: "independence", score: 2, passed: false }),
        score({ harness: "prediction_accountability", score: 2, passed: false }),
      ]),
    ]);
    expect(verdict).toContain("probability");
    expect(verdict).toContain("miscalibrated ones");
  });

  it("points at the writer prompt when the bar holds", () => {
    const verdict = calibrationVerdict([
      outside([score({ harness: "insight", score: 5 }), score({ harness: "clarity", score: 4 })]),
    ]);
    expect(verdict).toContain("The bar is real");
    expect(verdict).toContain("writer prompt");
  });

  it("reads the best outside script rather than the first", () => {
    const verdict = calibrationVerdict([
      outside([score({ harness: "insight", score: 2, passed: false })]),
      outside([score({ harness: "insight", score: 5 })]),
    ]);
    expect(verdict).toContain("The bar is real");
  });
});

/** The ceiling that stops a diagnostic becoming an invoice. */
describe("running a bounded piece of work on its own meter", () => {
  afterAll(() => resetSpend());

  it("returns what the work alone cost and leaves the caller's meter whole", async () => {
    resetSpend();
    const { result, costUsd } = await onOwnMeter(0.5, async () => "done");
    expect(result).toBe("done");
    expect(costUsd).toBe(0);
    expect(spentThisStepUsd()).toBe(0);
  });

  it("restores the ceiling even when the work throws", async () => {
    resetSpend();
    process.env.PUNDIT_MAX_STEP_COST_USD = "0.7";
    await expect(
      onOwnMeter(0.01, async () => {
        throw new Error("judge blew up");
      }),
    ).rejects.toThrow("judge blew up");
    const { costUsd } = await onOwnMeter(0.5, async () => null);
    expect(costUsd).toBe(0);
    delete process.env.PUNDIT_MAX_STEP_COST_USD;
  });
});

/** The judge pass the calibration harness calls is the same one the pipeline
 *  calls to decide publication. If they were two copies they would drift, and a
 *  reading taken against a drifted copy measures nothing. This drives it on
 *  stub responses, for nothing, in both modes. */
describe("judging a script that did not come from the pipeline", () => {
  const previous = {
    stub: process.env.PUNDIT_MODEL_STUB,
    prelaunch: process.env.PRELAUNCH_MODE,
    publication: process.env.PUNDIT_PUBLICATION_ENABLED,
  };

  beforeAll(() => {
    process.env.PUNDIT_MODEL_STUB = "true";
    process.env.PRELAUNCH_MODE = "true";
    process.env.PUNDIT_PUBLICATION_ENABLED = "false";
  });

  afterAll(() => {
    process.env.PUNDIT_MODEL_STUB = previous.stub;
    process.env.PRELAUNCH_MODE = previous.prelaunch;
    process.env.PUNDIT_PUBLICATION_ENABLED = previous.publication;
  });

  const input: StructuredMatchInput = {
    match: {
      id: "match-cal",
      homeTeam: "Barcelona",
      awayTeam: "Rayo",
      homeScore: 5,
      awayScore: 2,
      kickoffAt: "2026-08-31T19:00:00Z",
      competition: "La Liga",
      source: "provider-a",
    },
    events: [
      {
        id: "goal-1",
        type: "goal",
        minute: 12,
        team: "Barcelona",
        player: "Robert Lewandowski",
        source: "provider-a",
      },
    ],
    stats: {
      homeShots: 18,
      awayShots: 6,
      homeShotsOnTarget: 9,
      awayShotsOnTarget: 3,
      homePossession: 63,
      awayPossession: 37,
      homeCorners: 8,
      awayCorners: 2,
      homeSaves: 1,
      awaySaves: 4,
      source: "provider-a",
    },
  };

  it("returns a verdict for every dimension the publish gate requires", async () => {
    const pack = buildEvidencePack(input);
    const claims = await generateClaimLaboratory(pack);
    const outline = beatsFromProse(
      "Barcelona were relentless.\n\nRayo could not live with them.\n\nIt finished five two.",
    );
    const results = await judgeCandidate({
      candidate: {
        punditId: "romantic",
        specVersion: getPunditSpec("romantic").version,
        thesis: {
          punditId: "romantic",
          headline: "",
          judgment: "",
          selectedClaimIds: [],
          rejectedClaimIds: [],
          counterpoint: "",
          changeMyMind: "",
        },
        outline,
        displayScript: Object.values(outline).join("\n\n"),
        spokenScript: Object.values(outline).join("\n\n"),
        performancePlan: [],
        claimIds: [],
      },
      pack,
      claims,
      proseOnly: true,
    });
    const judged = shapeCalibrationScores(results, getPunditSpec("romantic").requiredThresholds);
    // Two hard gates plus the twelve scored dimensions.
    expect(judged.filter((item) => item.hardGate)).toHaveLength(2);
    expect(judged.filter((item) => !item.hardGate)).toHaveLength(12);
    for (const item of judged.filter((entry) => !entry.hardGate)) {
      expect(item.threshold, item.harness).toBeGreaterThan(0);
    }
    expect(
      calibrationVerdict([
        summariseSubject({
          label: "outside",
          punditId: "romantic",
          fromPipeline: false,
          scores: judged,
        }),
      ]),
    ).toBeTruthy();
  });
});
