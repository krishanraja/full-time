import { describe, expect, it } from "vitest";
import { isValidDropId } from "./editorial-public.server";

describe("public editorial identifiers", () => {
  it("accepts database UUIDs", () => {
    expect(isValidDropId("2775bfc5-5852-4b24-8577-c0d9fb54c58f")).toBe(true);
  });

  it("rejects malformed identifiers before they reach PostgREST", () => {
    expect(isValidDropId("not-a-real-drop")).toBe(false);
    expect(isValidDropId("2775bfc5-5852-4b24-8577-c0d9fb54c58f-extra")).toBe(false);
  });
});
