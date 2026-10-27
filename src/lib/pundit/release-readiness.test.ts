import { describe, expect, it } from "vitest";
import {
  areConsecutiveDates,
  median,
  percentage,
  isFullAlphaAudioReview,
} from "./release-readiness";
import { PUNDIT_IDS } from "./types";

describe("complete alpha listening reviews", () => {
  it.each([...PUNDIT_IDS])(
    "requires the complete %s recording within the alpha duration",
    (pundit_id) => {
      for (const seconds of [120, 150, 180]) {
        const variant = { pundit_id, audio_duration_sec: seconds };
        expect(isFullAlphaAudioReview(seconds, variant)).toBe(true);
        expect(isFullAlphaAudioReview(seconds - 1, variant)).toBe(false);
      }
      for (const seconds of [119, 181, 199, 360, NaN, Infinity]) {
        expect(isFullAlphaAudioReview(360, { pundit_id, audio_duration_sec: seconds })).toBe(false);
      }
      expect(isFullAlphaAudioReview(150, { pundit_id, audio_duration_sec: 150.2 })).toBe(false);
      expect(isFullAlphaAudioReview(151, { pundit_id, audio_duration_sec: 150.2 })).toBe(true);
      expect(isFullAlphaAudioReview(NaN, { pundit_id, audio_duration_sec: 150 })).toBe(false);
      expect(isFullAlphaAudioReview(150, { pundit_id, audio_duration_sec: null })).toBe(false);
      expect(isFullAlphaAudioReview(150)).toBe(false);
    },
  );
});

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
