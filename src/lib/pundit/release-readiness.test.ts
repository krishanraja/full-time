import { describe, expect, it } from "vitest";
import { areConsecutiveDates, median, percentage } from "./release-readiness";

describe("release readiness arithmetic", () => {
  it("calculates medians without allowing one dimension to hide another", () => {
    expect(median([5, 1, 4, 4])).toBe(4);
    expect(median([])).toBe(0);
  });

  it("fails empty percentages closed", () => {
    expect(percentage([])).toBe(0);
    expect(percentage([true, true, false, true])).toBe(0.75);
  });

  it("requires genuinely consecutive rehearsal dates", () => {
    expect(areConsecutiveDates(["2026-08-01", "2026-08-02", "2026-08-03"])).toBe(true);
    expect(areConsecutiveDates(["2026-08-01", "2026-08-03"])).toBe(false);
  });
});
