import { describe, expect, it } from "vitest";
import { judgeSchema, normaliseBeats } from "./pundit-generator.server";

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
