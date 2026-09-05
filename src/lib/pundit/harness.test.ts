import { describe, expect, it } from "vitest";
import { consequenceSpans, properNouns, spelledNumberValue } from "./harness";

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

  it("returns nothing for words that are not numbers", () => {
    expect(spelledNumberValue("Toulouse")).toBeUndefined();
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
