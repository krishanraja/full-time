import { describe, expect, it } from "vitest";
import { properNouns } from "./harness";

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
});
