import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");
}

describe("pundit migration contract", () => {
  it("keeps release and billing disabled by default", () => {
    const sql = migration("20260808200000_operational_release_gates.sql");
    expect(sql).toMatch(/public_launch_enabled BOOLEAN NOT NULL DEFAULT false/i);
    expect(sql).toMatch(/billing_enabled BOOLEAN NOT NULL DEFAULT false/i);
    expect(sql).toContain("public launch is fail-closed");
  });

  // The gate now publishes the pundits that passed rather than demanding all six
  // at once, and every per-variant condition it publishes on is unchanged. The
  // one that must never come back is a variant reaching listeners without its
  // full harness set, so the conditions are asserted individually.
  it("publishes only variants that passed every gate, and refuses a drop with none", () => {
    const sql = migration("20260905060000_publish_the_variants_that_passed.sql");
    expect(sql).toContain("variant_count < 1");
    expect(sql).toContain("pundit_count <> variant_count");
    expect(sql).toContain("audio_count <> variant_count");
    expect(sql).toContain("pv.pronunciation_rate >= 0.99");
    expect(sql).toContain("pv.script_identity_verified");
    expect(sql).toContain("vc.status = 'selected'");
    expect(sql).toContain("pv.tts_voice_id IS NOT DISTINCT FROM vc.provider_voice_ref");
    expect(sql).toContain("WHERE l.variant_id IS NULL OR NOT l.passed");
    for (const harness of [
      "evidence_to_claim_entailment",
      "factual_entailment",
      "humour_safety_semantic",
      "prediction_accountability",
    ]) {
      expect(sql).toContain(harness);
    }
  });

  it("still fails closed on the release state", () => {
    const sql = migration("20260905060000_publish_the_variants_that_passed.sql");
    expect(sql).toContain("public launch is fail-closed");
    expect(sql).toContain("release state is not backed by a passing immutable gate snapshot");
  });

  it("creates evidence and prediction records before operational release state", () => {
    const intelligence = migration("20260808194138_pundit_intelligence_system.sql");
    expect(intelligence).toContain("CREATE TABLE public.evidence_packs");
    expect(intelligence).toContain("CREATE TABLE public.prediction_ledger");
    expect(intelligence).toContain("CREATE TABLE public.harness_runs");
  });
});
