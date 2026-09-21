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

  /** The drift ledger is observability. Both tables are service-role only with
   *  no public policy, because nothing a listener sees should depend on them,
   *  and the editorial pipeline must never read them either - a run that can be
   *  changed by its own telemetry is not reproducible. */
  it("keeps the provider drift ledger service-role only", () => {
    const sql = migration("20260921120000_ingest_run_ledger.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.ingest_runs");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.provider_stat_presence");
    expect(sql).toContain("GRANT ALL ON public.ingest_runs TO service_role");
    expect(sql).toContain("GRANT ALL ON public.provider_stat_presence TO service_role");
    expect(sql).toContain("ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.provider_stat_presence ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]*(ingest_runs|provider_stat_presence)/i);
  });

  /** One row per statistic per day. The previous constraint on
   *  standings_snapshots included captured_at, which defaults to now(), so it
   *  could never collide: two runs in a day wrote two snapshots and the reader
   *  had to arbitrate. Nothing has ever written to that table, so this was
   *  never exercised - it is being fixed before it is first used. */
  it("gives a league one standings snapshot per day, with its provenance", () => {
    const sql = migration("20260921120000_ingest_run_ledger.sql");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS standings_snapshot_uniq");
    expect(sql).toContain(
      "ADD CONSTRAINT standings_snapshot_daily_uniq UNIQUE (league_id, season, captured_on)",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'api-football'");
  });

  /** Ruling (Krish, 2026-09-21): ingest the free-to-access analytics tier for
   *  production evidence, accepting the rights exposure.
   *
   *  What the ruling does not do is make a number from those sources a counted
   *  fact, or let a row claim a permission nobody granted. Both are asserted
   *  here because both are the kind of thing that erodes quietly. */
  it("records what a source estimate is and what its rights basis is", () => {
    const sql = migration("20260921140000_source_match_estimates.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.source_match_estimates");
    expect(sql).toContain("rights_basis  TEXT NOT NULL");
    expect(sql).toMatch(/CHECK \(rights_basis IN \('licensed', 'public-domain', 'unlicensed'\)\)/);
    expect(sql).toContain("GRANT ALL ON public.source_match_estimates TO service_role");
    expect(sql).toContain("ALTER TABLE public.source_match_estimates ENABLE ROW LEVEL SECURITY");
    // It is its own table, not columns bolted onto the licensed feed's record.
    expect(sql).not.toMatch(/ALTER TABLE public\.match_stats/);
  });

  it("creates evidence and prediction records before operational release state", () => {
    const intelligence = migration("20260808194138_pundit_intelligence_system.sql");
    expect(intelligence).toContain("CREATE TABLE public.evidence_packs");
    expect(intelligence).toContain("CREATE TABLE public.prediction_ledger");
    expect(intelligence).toContain("CREATE TABLE public.harness_runs");
  });
});
