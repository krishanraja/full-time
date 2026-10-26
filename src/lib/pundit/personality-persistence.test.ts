import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedPunditVariant } from "./pundit-generator.server";
import type { PunditVariantCandidate } from "./types";
const state = vi.hoisted(() => ({
  requests: [] as Array<{ path: string; options?: { body?: unknown } }>,
  baseline: undefined as string | undefined,
  produced: false,
}));
vi.mock("./service-rest.server", () => ({
  serviceRest: vi.fn(async (path: string, options?: { body?: unknown }) => {
    state.requests.push({ path, options });
    if (path.startsWith("daily_drops?coverage_date"))
      return [{ id: "drop-fixture", status: "building" }];
    if (path.startsWith("evidence_packs?drop_id")) return [{ match_id: "fixture-match" }];
    if (
      path.startsWith("evidence_packs?content_hash") ||
      path.startsWith("evidence_packs?match_id")
    )
      return [];
    if (path === "evidence_packs") return [{ id: "pack-fixture" }];
    if (path.startsWith("pundit_variants?on_conflict")) return [{ id: "variant-fixture" }];
    if (
      path.startsWith("harness_runs?variant_id") &&
      path.includes("harness_name=eq.personality_baseline")
    )
      return state.baseline ? [{ evidence_span: state.baseline }] : [];
    if (path.startsWith("pundit_variants?id") && state.produced)
      return [
        {
          pundit_id: "zen",
          status: "published",
          audio_url: "https://example.invalid/audio",
          audio_storage_path: "fixture/audio",
          share_image_url: "https://example.invalid/share",
          share_storage_path: "fixture/share",
          script_identity_verified: true,
          pronunciation_rate: 1,
          audio_quality: { passed: true },
        },
      ];
    if (path.startsWith("pundit_variants?id"))
      return [
        {
          id: "variant-fixture",
          drop_id: "drop-fixture",
          pundit_id: "zen",
          spec_version: 2,
          thesis: {
            punditId: "zen",
            headline: "Fixture",
            judgment: "Fixture",
            selectedClaimIds: [],
            rejectedClaimIds: [],
            counterpoint: "",
            changeMyMind: "",
          },
          beat_outline: {},
          display_script: "Fixture script.",
          spoken_script: "Fixture script.",
          performance_plan: [],
          status: "approved",
          daily_drops: { coverage_date: "2026-01-01" },
        },
      ];
    return [];
  }),
}));
vi.mock("./structured-match.server", () => ({
  loadStructuredMatch: vi.fn(async () => ({ entities: [] })),
}));
import { compilePersonalityBaseline } from "./personality/registry";
import { persistEditorialRehearsal } from "./editorial-repository.server";
import { rehydrateVariantForProduction } from "./variant-rehydrate.server";
import { producePunditVariant } from "./variant-production.server";

beforeEach(() => {
  state.requests.length = 0;
  state.baseline = undefined;
  state.produced = false;
});
describe("personality provenance follows the real persisted production path", () => {
  it("persists the writer baseline in existing harness records without schema changes", async () => {
    const baseline = await compilePersonalityBaseline("zen");
    const candidate: PunditVariantCandidate = {
      punditId: "zen",
      specVersion: 2,
      personalityBaseline: baseline,
      thesis: {
        punditId: "zen",
        headline: "Fixture",
        judgment: "Fixture",
        selectedClaimIds: [],
        rejectedClaimIds: [],
        counterpoint: "",
        changeMyMind: "",
      },
      outline: {
        hook: "",
        match_story: "",
        evidence: "",
        explanation: "",
        judgment: "",
        counterpoint: "",
        humour: "",
        portable_line: "",
        prediction_or_receipt: "",
        close: "",
      },
      displayScript: "Fixture script.",
      spokenScript: "Fixture script.",
      performancePlan: [],
      claimIds: [],
    };
    const generated: GeneratedPunditVariant = {
      candidate,
      attempts: 1,
      costUsd: 0,
      results: [],
      attemptResults: [{ attempt: 1, results: [] }],
      status: "approved",
    };
    await persistEditorialRehearsal({
      coverageDate: "2026-01-01",
      pack: {
        id: "pack-fixture",
        matchId: "fixture-match",
        version: 1,
        createdAt: "2026-01-01",
        facts: [],
        derivations: [],
        unavailableEvidence: [],
      },
      claims: [],
      variants: [generated],
    });
    const post = state.requests.find((request) =>
      request.path.startsWith("harness_runs?on_conflict"),
    )!;
    const row = (
      post.options!.body as Array<{ harness_name: string; evidence_span: string; model: string }>
    ).find((item) => item.harness_name === "personality_baseline")!;
    expect(JSON.parse(row.evidence_span)).toEqual(baseline);
    expect(row.model).toBe("deterministic-code");
  });
  it("rehydrates the stored baseline rather than stamping today's version onto old work", async () => {
    const baseline = await compilePersonalityBaseline("zen");
    state.baseline = JSON.stringify(baseline);
    const result = await rehydrateVariantForProduction("variant-fixture");
    expect(result.generated.candidate.personalityBaseline).toEqual(baseline);
    state.baseline = undefined;
    expect(
      (await rehydrateVariantForProduction("variant-fixture")).generated.candidate
        .personalityBaseline,
    ).toBeUndefined();
  });
  it("reuses already published audio before requiring a new narration baseline", async () => {
    state.produced = true;
    const generated = {
      candidate: { punditId: "zen" },
      status: "approved",
    } as GeneratedPunditVariant;
    const result = await producePunditVariant({
      dropId: "drop-fixture",
      coverageDate: "2026-01-01",
      variantId: "variant-fixture",
      generated,
      entities: [],
    });
    expect(result.passed).toBe(true);
    expect("reused" in result && result.reused).toBe(true);
    expect(state.requests).toHaveLength(1);
  });
});
