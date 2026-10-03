import { describe, expect, it } from "vitest";
import {
  consequenceSpans,
  judgeFloors,
  properNouns,
  spelledNumberValue,
  spelledNumbersIn,
} from "./harness";
import { getPunditSpec } from "./specs";

describe("spelled numbers found in a spoken script", () => {
  it("takes a spoken decimal whole, not as its digits", () => {
    const found = spelledNumbersIn(
      "On expected goals it was two point eight three to one point zero eight.",
    );
    expect(found.map((item) => item.value)).toEqual([2.83, 1.08]);
  });

  it("takes a compound whole and leaves ordinary words alone", () => {
    const found = spelledNumbersIn(
      "Twenty-four shots, ten on target, in the fifty-seventh minute.",
    );
    expect(found.map((item) => item.value)).toEqual([24, 10, 57]);
  });
});

describe("digit extraction for the numeric licence gate", () => {
  const digits = (script: string) =>
    [...script.matchAll(/(?<![A-Za-z0-9])\d+(?:\.\d+)?/g)].map((match) => match[0]);

  it("ignores digits that are part of an identifier", () => {
    expect(digits("per claim c4 and (c12), backed by f1782040")).toEqual([]);
  });

  it("still reads ordinals and plain counts", () => {
    expect(digits("24 shots by the 45th minute, 1-0 at the end")).toEqual(["24", "45", "1", "0"]);
  });
});

describe("season consequence detection", () => {
  it("blocks language that only makes sense at season level", () => {
    expect(consequenceSpans("That result pushes them towards relegation.")).toHaveLength(1);
    expect(consequenceSpans("A win like that is how sides stay up.")).toHaveLength(1);
    expect(consequenceSpans("This was a title performance.")).toHaveLength(1);
  });

  it("allows ordinary match verbs with no season stake beside them", () => {
    expect(consequenceSpans("Ueda secured the win with a header.")).toEqual([]);
    expect(consequenceSpans("The second goal confirmed the result.")).toEqual([]);
    expect(consequenceSpans("He sealed it late on.")).toEqual([]);
  });

  it("still blocks those verbs when a season stake sits beside them", () => {
    expect(consequenceSpans("That win secured their place in Europe.")).not.toEqual([]);
    expect(consequenceSpans("Survival was confirmed by that result.")).not.toEqual([]);
  });
});

describe("spelled number reading for the numeric licence gate", () => {
  it("reads a compound as one value rather than its parts", () => {
    expect(spelledNumberValue("twenty-four")).toBe(24);
    expect(spelledNumberValue("fifty-three")).toBe(53);
    expect(spelledNumberValue("forty-seven")).toBe(47);
  });

  it("reads compound ordinals used for minutes", () => {
    expect(spelledNumberValue("fifty-seventh")).toBe(57);
    expect(spelledNumberValue("seventy-third")).toBe(73);
  });

  it("reads plain cardinals, football idioms and nil", () => {
    expect(spelledNumberValue("ten")).toBe(10);
    expect(spelledNumberValue("hat-trick")).toBe(3);
    expect(spelledNumberValue("brace")).toBe(2);
    expect(spelledNumberValue("nil")).toBe(0);
  });

  it("reads a spoken decimal as one value", () => {
    expect(spelledNumberValue("two point eight three")).toBe(2.83);
    expect(spelledNumberValue("one point zero eight")).toBe(1.08);
    expect(spelledNumberValue("one point seven five")).toBe(1.75);
  });

  it("returns nothing for words that are not numbers", () => {
    expect(spelledNumberValue("Toulouse")).toBeUndefined();
    expect(spelledNumberValue("point")).toBeUndefined();
  });
});

describe("proper noun detection for the entity licence gate", () => {
  it("ignores ordinary capitalised words at the start of a sentence", () => {
    const script =
      "Somewhere in the second half the game turned. Because North FC kept the ball, South FC chased. Ten of the shots came late.";
    expect(properNouns(script)).toEqual(["North FC", "South FC"]);
  });

  it("keeps a sentence-initial name that also appears mid-sentence", () => {
    const script = "Haaland scored twice. The second goal from Haaland settled it.";
    expect(properNouns(script)).toEqual(["Haaland", "Haaland"]);
  });

  it("never treats spelled numbers or ordinals as names", () => {
    const script = "Twenty-four shots. Sixteen on target. Two goals from Saka in the Second half.";
    expect(properNouns(script)).toEqual(["Saka"]);
  });

  it("trims connectors and the pronoun I from phrase edges", () => {
    const script = "What I saw was Arsenal pressing. But I doubt Arsenal enjoyed it.";
    expect(properNouns(script)).toEqual(["Arsenal", "Arsenal"]);
  });

  it("never treats a contraction of the pronoun I as a name", () => {
    const script = "In fairness to Arsenal, and I'll say it once, I'm wrong about Arsenal.";
    expect(properNouns(script)).toEqual(["Arsenal", "Arsenal"]);
  });
});

/** The bench calibration exists because the OpenAI judges score this product's
 *  own published script a point lower than the Claude judges that approved it.
 *  It is a translation between instruments, so it has to vanish the moment the
 *  instrument changes back. */
describe("judge floors are translated per bench, never lowered permanently", () => {
  it("keeps the declared floors on an Anthropic bench", () => {
    const floors = judgeFloors("romantic", "claude-sonnet-4-6");
    expect(floors.restraint).toBe(4);
    expect(floors.probability).toBe(4);
    expect(floors.independence).toBe(4);
  });

  it("translates the three measured dimensions on an OpenAI bench", () => {
    const floors = judgeFloors("romantic", "gpt-5.6-terra");
    expect(floors.restraint).toBe(3);
    expect(floors.probability).toBe(3);
    expect(floors.independence).toBe(3);
  });

  it("leaves every other dimension exactly where the spec put it", () => {
    const declared = getPunditSpec("romantic").requiredThresholds;
    const floors = judgeFloors("romantic", "gpt-5.6-terra");
    for (const key of Object.keys(declared) as Array<keyof typeof declared>) {
      if (["restraint", "probability", "independence"].includes(key)) continue;
      expect(floors[key]).toBe(declared[key]);
    }
  });

  // A calibration that could raise a floor would be a second, invisible place
  // where the editorial bar is set.
  it("never raises a floor above the spec", () => {
    for (const model of ["gpt-5.6-terra", "claude-opus-4-8", "gemini-3.8-flash", ""]) {
      const declared = getPunditSpec("zen").requiredThresholds;
      const floors = judgeFloors("zen", model);
      for (const key of Object.keys(declared) as Array<keyof typeof declared>) {
        expect(floors[key]).toBeLessThanOrEqual(declared[key]);
      }
    }
  });

  it("does not apply to a Gemini bench, which has not been measured", () => {
    expect(judgeFloors("romantic", "gemini-3.8-flash").restraint).toBe(4);
  });
});
