import { describe, expect, it } from "vitest";
import { normaliseBeats } from "./pundit-generator.server";

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
