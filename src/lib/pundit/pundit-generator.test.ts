import { describe, expect, it } from "vitest";
import { hardJudgeSchema, judgeSchema, normaliseBeats } from "./pundit-generator.server";

describe("judge response tolerance", () => {
  // The run this cost: a judge given a fuller rubric cited several spans and
  // returned a list where the schema wanted a string. The step threw, the
  // workflow failed, and six scripts already written were lost. What the judge
  // means is the same either way.
  it("accepts several cited spans as well as one", () => {
    expect(judgeSchema.parse({ score: 2, evidenceSpan: ["first span", "second span"] }).evidenceSpan)
      .toBe("first span | second span");
    expect(judgeSchema.parse({ score: 2, evidenceSpan: "one span" }).evidenceSpan).toBe("one span");
    expect(judgeSchema.parse({ score: 2, evidenceSpan: [] }).evidenceSpan).toBe("");
  });

  it("accepts explicit nulls for the optional fields", () => {
    const parsed = judgeSchema.parse({
      score: 4,
      evidenceSpan: null,
      failure: null,
      requestedRepair: null,
      failedBeats: null,
    });
    expect(parsed.score).toBe(4);
    expect(parsed.evidenceSpan).toBeUndefined();
    expect(parsed.failure).toBeUndefined();
    expect(parsed.failedBeats).toEqual([]);
  });

  it("still accepts an omitted field and a real value", () => {
    const parsed = judgeSchema.parse({ score: 2, failure: "Too thin", failedBeats: ["hook"] });
    expect(parsed.failure).toBe("Too thin");
    expect(parsed.evidenceSpan).toBeUndefined();
    expect(parsed.failedBeats).toEqual(["hook"]);
  });

  it("still rejects a score outside the scale", () => {
    expect(() => judgeSchema.parse({ score: 9 })).toThrow();
  });
});

const beat = (text: string) => ({ text, intent: "setup", pace: "measured", energy: 3 });

describe("writer beat container normalisation", () => {
  it("passes an array through untouched", () => {
    const beats = [{ name: "hook", ...beat("Hello") }];
    expect(normaliseBeats(beats)).toBe(beats);
  });

  it("folds an object keyed by beat name into an ordered array", () => {
    const result = normaliseBeats({
      evidence: beat("Second"),
      hook: beat("First"),
    }) as Array<{ name: string; text: string }>;
    expect(result.map((item) => item.name)).toEqual(["hook", "evidence"]);
    expect(result[0].text).toBe("First");
  });

  it("keeps an explicit name inside the value when present", () => {
    const result = normaliseBeats({ hook: { name: "hook", ...beat("x") } }) as Array<{
      name: string;
    }>;
    expect(result[0].name).toBe("hook");
  });

  it("leaves scalars alone for the schema to reject", () => {
    expect(normaliseBeats("nope")).toBe("nope");
    expect(normaliseBeats(null)).toBe(null);
  });
});

/** A judge whose answer is thrown away is recorded as a failure of the script,
 *  so every schema detail that can reject a well-meant verdict quarantines
 *  prose for a reason that has nothing to do with the prose. Both of these
 *  happened on the 2026-09-20 drop and between them discarded five of six
 *  factual_entailment verdicts. */
describe("a judge's verdict survives the shape it arrives in", () => {
  it("drops a beat name it does not recognise instead of voiding the judgement", () => {
    // "changeMyMind" is a real field on the thesis and not a beat, which is
    // exactly why a judge reached for it.
    const parsed = hardJudgeSchema.parse({
      passed: false,
      failure: "The prediction is unsupported.",
      failedBeats: ["prediction_or_receipt", "changeMyMind"],
    });
    expect(parsed.failedBeats).toEqual(["prediction_or_receipt"]);
    expect(parsed.failure).toBe("The prediction is unsupported.");
  });

  it("does the same for a qualitative judge", () => {
    expect(
      judgeSchema.parse({ score: 2, failedBeats: ["hook", "changeMyMind"] }).failedBeats,
    ).toEqual(["hook"]);
  });

  it("takes the reason from the repair when the judge left `failure` empty", () => {
    const parsed = hardJudgeSchema.parse({
      passed: false,
      failure: "   ",
      requestedRepair: "Cut the claim that Sunderland dominated.",
    });
    expect(parsed.failure).toBe("Cut the claim that Sunderland dominated.");
  });

  it("falls back to the cited span when that is all there is", () => {
    expect(
      hardJudgeSchema.parse({ passed: false, evidenceSpan: "they were the better side" }).failure,
    ).toBe("they were the better side");
  });

  // Still fail-closed. A rejection carrying nothing at all gives the writer
  // nothing to repair, and pretending otherwise would be worse than refusing.
  it("still refuses a rejection that names nothing", () => {
    expect(() => hardJudgeSchema.parse({ passed: false })).toThrow();
  });

  it("asks nothing of a verdict that passed", () => {
    expect(hardJudgeSchema.parse({ passed: true }).failure).toBeUndefined();
  });
});
