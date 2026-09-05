import { describe, expect, it } from "vitest";
import {
  decidePublication,
  REQUIRED_HARNESS_NAMES,
  type HarnessRow,
  type VariantRow,
} from "./promise-checks.server";
import type { PunditId } from "./types";

/** The decision that puts a show in front of a listener.
 *
 *  It was rewritten on 2026-09-05, when the gate stopped demanding all six
 *  pundits at once and began publishing the ones that passed. Nothing decides
 *  more about what a listener hears, and until now nothing tested it. */

const ready = (punditId: PunditId, over: Partial<VariantRow> = {}): VariantRow =>
  ({
    id: `v-${punditId}`,
    drop_id: "drop-1",
    pundit_id: punditId,
    spec_version: 1,
    thesis: {},
    title: "t",
    description: "d",
    display_script: "s",
    performance_plan: [],
    audio_url: `https://cdn/${punditId}.mp3`,
    audio_bytes: 5_000_000,
    audio_duration_sec: 332,
    share_image_url: `https://cdn/${punditId}.png`,
    transcript: "a verified transcript",
    published_at: null,
    status: "approved",
    script_identity_verified: true,
    audio_quality: { passed: true },
    pronunciation_rate: 1,
    voice_candidate_id: `voice-${punditId}`,
    ...over,
  }) as VariantRow;

/** Every required harness passing, for one variant. */
const allPassed = (variantId: string): HarnessRow[] =>
  REQUIRED_HARNESS_NAMES.map((harness_name) => ({
    variant_id: variantId,
    harness_name,
    attempt: 1,
    passed: true,
    created_at: "2026-09-05T00:00:00Z",
  }));

const decide = (variants: VariantRow[], harnesses: HarnessRow[]) =>
  decidePublication({ variants, harnesses });

const passing = (name: string) => (checks: ReturnType<typeof decide>["checks"]) =>
  checks.find((check) => check.name === name)?.passed;

describe("deciding which pundits publish", () => {
  it("publishes the one that passed and withholds the rest, with reasons", () => {
    const romantic = ready("romantic");
    const gaffer = ready("gaffer", { id: "v-gaffer", audio_quality: { passed: false } });
    const result = decide([romantic, gaffer], [...allPassed("v-romantic"), ...allPassed("v-gaffer")]);

    expect(result.publishable.map((v) => v.pundit_id)).toEqual(["romantic"]);
    expect(result.withheld.join(" ")).toContain("gaffer: audio quality");
    expect(passing("publishable_variants")(result.checks)).toBe(true);
  });

  it("refuses a drop where nothing qualifies", () => {
    const result = decide([ready("zen", { pronunciation_rate: 0.9 })], allPassed("v-zen"));
    expect(result.publishable).toEqual([]);
    expect(passing("publishable_variants")(result.checks)).toBe(false);
  });

  // The whole point of the change: five failures no longer withhold the sixth.
  it("publishes one clean pundit out of six", () => {
    const variants = [
      ready("romantic"),
      ready("zen", { transcript: null }),
      ready("gaffer", { audio_url: null }),
      ready("stats", { share_image_url: null }),
      ready("doomer", { audio_duration_sec: 120 }),
      ready("banter", { voice_candidate_id: null }),
    ];
    const result = decide(
      variants,
      variants.flatMap((variant) => allPassed(variant.id)),
    );
    expect(result.publishable.map((v) => v.pundit_id)).toEqual(["romantic"]);
    expect(result.withheld).toHaveLength(5);
    expect(result.withheld.join(" ")).toContain("duration 120s");
  });

  it("withholds a variant that failed one required harness", () => {
    const harnesses = allPassed("v-zen").map((row) =>
      row.harness_name === "probability" ? { ...row, passed: false } : row,
    );
    const result = decide([ready("zen")], harnesses);
    expect(result.publishable).toEqual([]);
    expect(result.withheld.join(" ")).toContain("probability");
  });

  it("withholds a variant whose harnesses never ran", () => {
    const result = decide([ready("zen")], []);
    expect(result.publishable).toEqual([]);
    expect(result.withheld.join(" ")).toContain("evidence_to_claim_entailment");
  });

  // A later attempt supersedes an earlier one, which is how a repaired variant
  // reaches listeners at all.
  it("reads the latest attempt, not the first", () => {
    const harnesses: HarnessRow[] = [
      ...allPassed("v-zen").map((row) =>
        row.harness_name === "humour" ? { ...row, passed: false } : row,
      ),
      {
        variant_id: "v-zen",
        harness_name: "humour",
        attempt: 2,
        passed: true,
        created_at: "2026-09-05T01:00:00Z",
      },
    ];
    expect(decide([ready("zen")], harnesses).publishable).toHaveLength(1);
  });

  it("refuses two personas sharing one audio file", () => {
    const zen = ready("zen");
    const gaffer = ready("gaffer", { audio_url: zen.audio_url });
    const result = decide([zen, gaffer], [...allPassed("v-zen"), ...allPassed("v-gaffer")]);
    expect(passing("distinct_audio")(result.checks)).toBe(false);
  });

  it("refuses two personas sharing one voice", () => {
    const zen = ready("zen");
    const gaffer = ready("gaffer", { voice_candidate_id: zen.voice_candidate_id });
    const result = decide([zen, gaffer], [...allPassed("v-zen"), ...allPassed("v-gaffer")]);
    expect(passing("distinct_voices")(result.checks)).toBe(false);
  });

  it("refuses the same pundit twice in one drop", () => {
    const first = ready("zen");
    const second = ready("zen", { id: "v-zen-2", audio_url: "https://cdn/other.mp3" });
    const result = decide(
      [first, second],
      [...allPassed("v-zen"), ...allPassed("v-zen-2")],
    );
    expect(passing("pundit_identity")(result.checks)).toBe(false);
  });

  it("names the pundits that were never generated", () => {
    const result = decide([ready("romantic")], allPassed("v-romantic"));
    expect(result.missing).toEqual(["zen", "gaffer", "stats", "doomer", "banter"]);
  });

  it("publishes all six when all six are ready", () => {
    const variants: VariantRow[] = (
      ["zen", "gaffer", "stats", "romantic", "doomer", "banter"] as PunditId[]
    ).map((punditId) => ready(punditId));
    const result = decide(
      variants,
      variants.flatMap((variant) => allPassed(variant.id)),
    );
    expect(result.publishable).toHaveLength(6);
    expect(result.withheld).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });
});
