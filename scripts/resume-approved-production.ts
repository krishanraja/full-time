/** Resume a technical audio failure against the unchanged, reviewed script.
 * No writer, laboratory or judge calls; no new editorial approval is asserted. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { serviceRest } from "../src/lib/pundit/service-rest.server";
import { REQUIRED_HARNESS_NAMES } from "../src/lib/pundit/promise-checks.server";

const id = process.env.PRODUCTION_VARIANT ?? "";
if (id !== "ceb79a36-7c51-41d8-9c08-eb5e49643e2c")
  throw Error("Outside approved single Reporter production.");
const manifest = JSON.parse(
  await readFile("scripts/editorial-recovery/tottenham-2026-10-19-zen.json", "utf8"),
);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const base = process.env.FULL_TIME_URL?.replace(/\/$/, "");
if (
  base !== "https://fulltime.fm" ||
  process.env.SUPABASE_URL !== "https://hzadscrqmyilbisexvyz.supabase.co"
)
  throw Error("Wrong production target.");
const report: Record<string, unknown> = {
  variantId: id,
  dropId: manifest.dropId,
  modelCostUsd: 0,
  published: false,
};
async function runtime(path: string, body: unknown) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(780000),
  });
  if (!r.ok) throw Error(`Production request failed (${r.status}).`);
  return r.json();
}
try {
  const variants = await serviceRest<
    Array<{
      id: string;
      drop_id: string;
      pundit_id: string;
      display_script: string;
      status: string;
    }>
  >(`pundit_variants?id=eq.${id}&select=id,drop_id,pundit_id,display_script,status`);
  const v = variants[0];
  if (
    !v ||
    v.drop_id !== manifest.dropId ||
    v.pundit_id !== "zen" ||
    hash(v.display_script) !== hash(manifest.candidate.displayScript)
  )
    throw Error("Reviewed script changed.");
  const rows = await serviceRest<Array<{ harness_name: string; attempt: number; passed: boolean }>>(
    `harness_runs?variant_id=eq.${id}&select=harness_name,attempt,passed&order=attempt.desc,created_at.desc`,
  );
  const latest = new Map<string, boolean>();
  for (const row of rows)
    if (!latest.has(row.harness_name)) latest.set(row.harness_name, row.passed);
  const failed = REQUIRED_HARNESS_NAMES.filter((name) => latest.get(name) !== true);
  if (failed.length) throw Error(`Editorial approval is incomplete: ${failed.join(", ")}`);
  report.editorialChecksPassed = REQUIRED_HARNESS_NAMES.length;
  if (v.status === "published") {
    report.published = true;
    report.reused = true;
  } else {
    if (!["approved", "quarantined"].includes(v.status))
      throw Error("Variant cannot resume production.");
    if (v.status === "quarantined")
      await serviceRest(`pundit_variants?id=eq.${id}&status=eq.quarantined`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: { status: "approved" },
      });
    report.production = await runtime("/api/internal/produce-variant", { variantId: id });
    if (!(report.production as { passed: boolean }).passed)
      throw Error("Audio production refused the edition.");
    report.publication = await runtime(`/api/internal/publish-drop?dropId=${manifest.dropId}`, {});
    report.published = true;
  }
} catch (error) {
  report.failure = error instanceof Error ? error.message : "Production failed closed.";
  process.exitCode = 1;
} finally {
  await writeFile("recovery-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
