import { describe, expect, it } from "vitest";
import { extractJson } from "./anthropic-json.server";

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
