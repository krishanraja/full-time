import { describe, expect, it } from "vitest";
import { extractJson, requestContent } from "./anthropic-json.server";

describe("reading one JSON object out of a model response", () => {
  it("reads a bare object", () => {
    expect(extractJson('{"score":4}')).toEqual({ score: 4 });
  });

  it("reads an object inside a fenced block", () => {
    expect(extractJson('```json\n{"score":4}\n```')).toEqual({ score: 4 });
  });

  it("skips a brace that appears in prose before the object", () => {
    const text = 'Here is the shape { as described } and now the answer:\n{"score":5}';
    expect(extractJson(text)).toEqual({ score: 5 });
  });

  it("keeps braces that sit inside strings", () => {
    expect(extractJson('{"failure":"the { character"}')).toEqual({
      failure: "the { character",
    });
  });

  it("explains that a cut-off response is the likely cause", () => {
    expect(() => extractJson('{"score":4,"failure":"never clo')).toThrow(/cut off/i);
  });

  it("rejects a response with no object at all", () => {
    expect(() => extractJson("no JSON here")).toThrow(/no JSON object/i);
  });
});

describe("cache breakpoint placement", () => {
  it("marks every stable block and never the varying tail", () => {
    const blocks = requestContent([{ pack: 1 }, { spec: 2 }], '{"rubric":"humour"}');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[2].cache_control).toBeUndefined();
  });

  it("keeps the varying content last, where it cannot invalidate a prefix", () => {
    const blocks = requestContent([{ pack: 1 }], "VARYING");
    expect(blocks.at(-1)?.text).toContain("VARYING");
    expect(blocks.at(-1)?.cache_control).toBeUndefined();
  });

  it("still works with nothing cached", () => {
    const blocks = requestContent([], "just this");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].cache_control).toBeUndefined();
  });

  it("serialises stable blocks deterministically", () => {
    const segment = { evidencePack: { facts: [1, 2] }, licensedClaims: ["a"] };
    expect(requestContent([segment], "x")[0].text).toBe(requestContent([segment], "y")[0].text);
  });
});
