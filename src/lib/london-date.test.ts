import { describe, expect, it } from "vitest";
import {
  currentCoverageDate,
  londonDate,
  londonDayBounds,
  coverageDateShortLabel,
} from "./london-date";

describe("London coverage dates", () => {
  it("uses London rather than the server locale", () => {
    expect(londonDate(new Date("2026-08-08T23:30:00Z"))).toBe("2026-08-09");
    expect(currentCoverageDate(new Date("2026-08-08T23:30:00Z"))).toBe("2026-08-08");
  });

  it("handles the short spring DST day", () => {
    const bounds = londonDayBounds("2026-03-29");
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("handles the long autumn DST day", () => {
    const bounds = londonDayBounds("2026-10-25");
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(25 * 60 * 60 * 1000);
  });
});

describe("coverageDateShortLabel", () => {
  it("fits the scoreboard line", () => {
    expect(coverageDateShortLabel("2026-09-20")).toBe("Sun 20 Sep");
    expect(coverageDateShortLabel("2026-10-25")).toBe("Sun 25 Oct");
  });
});
