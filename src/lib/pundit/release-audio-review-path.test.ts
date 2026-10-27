import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  seconds: 150 as number | null,
  reviewed: 150,
  paths: [] as string[],
}));
vi.mock("./service-rest.server", () => ({
  serviceRest: vi.fn(async (path: string) => {
    fixture.paths.push(path);
    if (path.startsWith("pundit_variants?"))
      return [{ id: "alpha", pundit_id: "gaffer", audio_duration_sec: fixture.seconds }];
    if (path.startsWith("audio_reviews?"))
      return [
        {
          variant_id: "alpha",
          sample_seconds: fixture.reviewed,
          persona_guess: "gaffer",
          authority_rating: 4,
          naturalness_rating: 4,
          timing_rating: 4,
          listenability_rating: 4,
          pronunciation_errors: [],
          clipped_words: false,
          repeated_phrases: false,
          misplaced_emphasis: false,
          monotone: false,
          overacted_punchlines: false,
          synthesis_artifacts: false,
          approved: true,
        },
      ];
    return [];
  }),
}));
import { evaluateReleaseReadiness } from "./release-readiness.server";

it("uses the stored audio duration when counting complete human reviews", async () => {
  const evaluate = async (duration: number | null, reviewed: number) => {
    fixture.seconds = duration;
    fixture.reviewed = reviewed;
    return (await evaluateReleaseReadiness("alpha-fixture")).snapshot;
  };
  for (const [duration, reviewed, passes] of [
    [150, 150, true],
    [180, 180, true],
    [180, 120, false],
    [360, 300, false],
    [199, 199, false],
    [null, 150, false],
  ] as const) {
    const snapshot = await evaluate(duration, reviewed);
    expect(snapshot.gates.find((g) => g.name === "audio_naturalness_rating_gaffer")?.passed).toBe(
      passes,
    );
    // Audio evidence alone cannot approve an entire release.
    expect(snapshot.passed).toBe(false);
  }
  expect(fixture.paths).toContain("pundit_variants?select=id,pundit_id,audio_duration_sec");
});
