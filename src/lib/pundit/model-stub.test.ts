import { afterEach, describe, expect, it } from "vitest";
import { stubEnabled, stubResponse } from "./model-stub.server";
import { judgeSchema } from "./pundit-generator.server";

const cachedContext = [
  {
    evidencePack: {
      facts: [
        { id: "match.home_team", value: "North FC" },
        { id: "match.away_team", value: "South FC" },
        { id: "match.home_score", value: 1 },
        { id: "match.away_score", value: 2 },
      ],
    },
    licensedClaims: [],
  },
];

describe("the stub model", () => {
  it("answers a judge with a shape the real schema accepts", () => {
    const parsed = judgeSchema.parse(stubResponse("judge:humour", cachedContext, "{}"));
    expect(parsed.score).toBe(5);
    expect(parsed.failedBeats).toEqual([]);
  });

  it("answers a hard judge with a pass", () => {
    expect(stubResponse("hard-judge:factual_entailment", cachedContext, "{}")).toEqual({
      passed: true,
      failedBeats: [],
    });
  });

  it("writes all ten beats, in order", () => {
    const draft = stubResponse("writer:zen", cachedContext, '{"id":"c1"}') as {
      beats: Array<{ name: string; text: string }>;
    };
    expect(draft.beats).toHaveLength(10);
    expect(draft.beats[0].name).toBe("hook");
    expect(draft.beats.at(-1)?.name).toBe("close");
  });

  it("builds the script from names the evidence pack licences", () => {
    const draft = stubResponse("writer:zen", cachedContext, '{"id":"c1"}') as {
      beats: Array<{ text: string }>;
    };
    const script = draft.beats.map((beat) => beat.text).join(" ");
    expect(script).toContain("North FC");
    expect(script).toContain("South FC");
    // No digits: the numeric licence has nothing to reject.
    expect(script).not.toMatch(/\d/);
  });

  it("clears the spoken-length floor", () => {
    const draft = stubResponse("writer:zen", cachedContext, '{"id":"c1"}') as {
      beats: Array<{ text: string }>;
    };
    const words = draft.beats
      .map((beat) => beat.text)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(750);
    expect(words).toBeLessThanOrEqual(1100);
  });

  it("echoes back a claim reference the writer was given", () => {
    const draft = stubResponse("writer:zen", cachedContext, '{"licensed":["c4"]}') as {
      thesis: { selectedClaimIds: string[] };
    };
    expect(draft.thesis.selectedClaimIds).toEqual(["c4"]);
  });

  it("refuses a label it has no answer for, rather than guessing", () => {
    expect(() => stubResponse("something-new", cachedContext, "{}")).toThrow(/no canned response/);
  });
});

describe("the stub can never publish", () => {
  afterEach(() => {
    delete process.env.PUNDIT_MODEL_STUB;
    delete process.env.PUNDIT_PUBLICATION_ENABLED;
  });

  it("is off unless explicitly enabled", () => {
    expect(stubEnabled()).toBe(false);
  });

  it("is on when enabled and publication is off", () => {
    process.env.PUNDIT_MODEL_STUB = "true";
    process.env.PUNDIT_PUBLICATION_ENABLED = "false";
    expect(stubEnabled()).toBe(true);
  });

  it("refuses loudly when publication is enabled", () => {
    process.env.PUNDIT_MODEL_STUB = "true";
    process.env.PUNDIT_PUBLICATION_ENABLED = "true";
    expect(() => stubEnabled()).toThrow(/never be published/);
  });
});
