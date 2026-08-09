import { describe, expect, it } from "vitest";
import { parseFfmpegDuration } from "./audio-mastering.server";

describe("mastered audio metadata", () => {
  it("uses FFmpeg's measured duration including fractional seconds", () => {
    expect(parseFfmpegDuration("Duration: 00:06:17.42, start: 0.025057, bitrate: 128 kb/s")).toBe(
      377.42,
    );
  });

  it("fails closed when FFmpeg does not report a duration", () => {
    expect(() => parseFfmpegDuration("audio stream unavailable")).toThrow(/duration/i);
  });
});
