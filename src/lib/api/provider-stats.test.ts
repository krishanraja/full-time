import { describe, expect, it } from "vitest";
import { hasStat, statLabels, statNumber } from "./provider-stats";

/** The shape the provider actually sends, using its display names. */
const stats = [
  { type: "Total Shots", value: 24 },
  { type: "Shots on Goal", value: 10 },
  { type: "Ball Possession", value: "53%" },
  { type: "expected_goals", value: "2.83" },
];

describe("reading a provider statistic", () => {
  it("reads a plain number", () => {
    expect(statNumber(stats, "Total Shots")).toBe(24);
  });

  it("reads a percentage as a number", () => {
    expect(statNumber(stats, "Ball Possession")).toBe(53);
  });

  it("reads a decimal sent as a string", () => {
    expect(statNumber(stats, "expected_goals")).toBe(2.83);
  });

  // The fault that lost five days of expected goals: every other field is
  // matched by its display name, and this one alone by a snake_case key, so a
  // provider-side rename dropped one column and raised nothing.
  it("matches regardless of case, spacing or punctuation", () => {
    expect(statNumber([{ type: "Expected Goals", value: 2.83 }], "expected_goals")).toBe(2.83);
    expect(statNumber([{ type: "expected goals", value: 2.83 }], "expected_goals")).toBe(2.83);
    expect(statNumber([{ type: "expected-goals", value: 2.83 }], "expected_goals")).toBe(2.83);
    expect(statNumber([{ type: "expected_goals", value: 2.83 }], "Expected Goals")).toBe(2.83);
  });

  it("still tells two different statistics apart", () => {
    expect(statNumber(stats, "Shots on Goal")).toBe(10);
    expect(statNumber(stats, "Shots off Goal")).toBeNull();
  });

  it("returns null for an absent statistic", () => {
    expect(statNumber(stats, "Corner Kicks")).toBeNull();
  });

  it("returns null for a value that is not a number", () => {
    expect(statNumber([{ type: "Total Shots", value: "n/a" }], "Total Shots")).toBeNull();
  });

  it("copes with a missing statistics list", () => {
    expect(statNumber(null, "Total Shots")).toBeNull();
    expect(statNumber([], "Total Shots")).toBeNull();
  });
});

describe("telling absence from an unreadable value", () => {
  it("reports a statistic the provider did send", () => {
    expect(hasStat(stats, "Total Shots")).toBe(true);
    expect(hasStat([{ type: "Total Shots", value: "n/a" }], "Total Shots")).toBe(true);
  });

  it("reports a statistic the provider did not send", () => {
    expect(hasStat(stats, "Corner Kicks")).toBe(false);
    expect(hasStat(null, "Total Shots")).toBe(false);
  });

  it("lists the labels the provider used, in its own words", () => {
    expect(statLabels(stats)).toEqual([
      "Total Shots",
      "Shots on Goal",
      "Ball Possession",
      "expected_goals",
    ]);
    expect(statLabels(null)).toEqual([]);
  });
});
