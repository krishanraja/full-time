import { describe, expect, it } from "vitest";
import {
  advisoryOnThisBench,
  hardJudgeSchema,
  judgeSchema,
  normaliseBeats,
} from "./pundit-generator.server";

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

/** The provider swap re-opened a fault this file had just closed, in a field
 *  nobody had widened. Probed against gpt-5.6-terra before it served a paid
 *  run: it answers `"failure": ["...", "..."]` when asked to name every
 *  unsupported assertion. */
describe("a judge's reasoning survives arriving as a list", () => {
  it("joins a failure sent as an array", () => {
    const parsed = hardJudgeSchema.parse({
      passed: false,
      failure: ["The xG attribution is reversed.", "The prediction is unsupported."],
    });
    expect(parsed.failure).toBe("The xG attribution is reversed. | The prediction is unsupported.");
  });

  it("joins a requested repair sent as an array", () => {
    expect(
      hardJudgeSchema.parse({ passed: false, failure: "x", requestedRepair: ["Cut it.", "Or fix."] })
        .requestedRepair,
    ).toBe("Cut it. | Or fix.");
  });

  it("does the same on the qualitative judge", () => {
    expect(judgeSchema.parse({ score: 2, failure: ["a", "b"] }).failure).toBe("a | b");
  });

  // A rejection whose reason arrives as an EMPTY array still names nothing, so
  // it is still refused rather than passed off as a reason.
  it("still refuses a rejection whose list is empty", () => {
    expect(() => hardJudgeSchema.parse({ passed: false, failure: [] })).toThrow();
  });
});

/** Ruling (Krish, 2026-09-21): factual_entailment is advisory while an OpenAI
 *  bench judges, so a listening test can happen at all. Everything about that
 *  is narrow on purpose, and each boundary is worth a test because the ones
 *  that matter are the ones it must NOT relax. */
describe("the advisory entailment gate is narrow and expires", () => {
  const failed = (harness: string) =>
    ({ harness, hardGate: true, passed: false, failure: "City had control" }) as never;

  it("stops blocking on an OpenAI bench and keeps the critique", () => {
    const out = advisoryOnThisBench(failed("factual_entailment"), "gpt-5.6-terra");
    expect(out.passed).toBe(true);
    expect(out.failure).toContain("ADVISORY");
    expect(out.failure).toContain("City had control");
  });

  it("still blocks on an Anthropic bench, so it expires with the swap", () => {
    expect(advisoryOnThisBench(failed("factual_entailment"), "claude-haiku-4-5").passed).toBe(false);
  });

  it("does not apply to a Gemini bench, which was never measured", () => {
    expect(advisoryOnThisBench(failed("factual_entailment"), "gemini-3.8-flash").passed).toBe(false);
  });

  // The safety gate is not an accuracy gate and stays fail-closed.
  it("never touches humour_safety_semantic", () => {
    expect(advisoryOnThisBench(failed("humour_safety_semantic"), "gpt-5.6-terra").passed).toBe(
      false,
    );
  });

  it("leaves a passing verdict exactly as it found it", () => {
    const pass = { harness: "factual_entailment", hardGate: true, passed: true } as never;
    expect(advisoryOnThisBench(pass, "gpt-5.6-terra")).toBe(pass);
  });
});
