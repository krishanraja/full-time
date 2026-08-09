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

  it("requires six complete variants and the full harness set before publication", () => {
    const sql = migration("20260808200000_operational_release_gates.sql");
    expect(sql).toContain("variant_count <> 6");
    expect(sql).toContain("pundit_count <> 6");
    expect(sql).toContain("missing_required_harnesses <> 0");
    expect(sql).toContain("unlicensed_voices <> 0");
  });

  it("creates evidence and prediction records before operational release state", () => {
    const intelligence = migration("20260808194138_pundit_intelligence_system.sql");
    expect(intelligence).toContain("CREATE TABLE public.evidence_packs");
    expect(intelligence).toContain("CREATE TABLE public.prediction_ledger");
    expect(intelligence).toContain("CREATE TABLE public.harness_runs");
  });
});
