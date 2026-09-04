import { describe, expect, it } from "vitest";
import { uniformRows } from "./service-rest.server";

describe("bulk insert row normalisation", () => {
  it("gives every row the union of keys with explicit nulls", () => {
    const rows = uniformRows([
      { a: 1, score: 4 },
      { a: 2, failure: "x", score: undefined },
    ]) as Array<Record<string, unknown>>;
    expect(rows).toEqual([
      { a: 1, score: 4, failure: null },
      { a: 2, score: null, failure: "x" },
    ]);
    expect(Object.keys(rows[0])).toEqual(Object.keys(rows[1]));
  });

  it("passes single objects and non-object arrays through", () => {
    const single = { a: 1 };
    expect(uniformRows(single)).toBe(single);
    const ids = ["x", "y"];
    expect(uniformRows(ids)).toBe(ids);
    expect(uniformRows([])).toEqual([]);
  });
});
