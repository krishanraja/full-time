/** One operator-approved review of a saved script. Never writes new prose,
 * regenerates claims, weakens a gate, or repeats a paid pass automatically. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { loadSealedEvidence } from "../src/lib/pundit/judge-calibration.server";
import { serviceRest } from "../src/lib/pundit/service-rest.server";
import { runHardGates, publicationDecision } from "../src/lib/pundit/harness";
import { onOwnMeter } from "../src/lib/pundit/model-cost";
import { judgeCandidate } from "../src/lib/pundit/pundit-generator.server";
import { persistEditorialRehearsal } from "../src/lib/pundit/editorial-repository.server";
import { loadRightsClearedOriginalityCorpus } from "../src/lib/pundit/research-originality.server";
import { maxSourceSimilarity } from "../src/lib/pundit/research-originality";
import { finishRun } from "../src/lib/pundit/daily-orchestrator.server";
import type { HarnessResult, PunditVariantCandidate } from "../src/lib/pundit/types";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const root = resolve("scripts/editorial-recovery");
const file = resolve(root, process.env.RECOVERY_CANDIDATE ?? "");
if (relative(root, file).startsWith("..") || !file.endsWith(".json"))
  throw Error("Invalid recovery manifest path.");
const manifest = JSON.parse(await readFile(file, "utf8")) as {
  dropId: string;
  matchId: string;
  coverageDate: string;
  originalScriptSha256: string;
  candidate: PunditVariantCandidate;
};
const { candidate, dropId, coverageDate } = manifest;
const base = process.env.FULL_TIME_URL?.replace(/\/$/, "");
if (
  base !== "https://fulltime.fm" ||
  process.env.SUPABASE_URL !== "https://hzadscrqmyilbisexvyz.supabase.co"
)
  throw Error("Recovery target mismatch.");
if (candidate.punditId !== "zen" || candidate.spokenScript.length * 3 > 20_000)
  throw Error("Outside single Reporter narration approval.");
const report: Record<string, unknown> = {
  dropId,
  matchId: manifest.matchId,
  punditId: candidate.punditId,
  approvedModelCapUsd: 1,
  published: false,
};
let runId: string | undefined;
async function runtime(path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(780_000),
  });
  const result = await response.json();
  if (!response.ok) throw Error(`Runtime operation failed (${response.status}).`);
  return result;
}
try {
  const drops = await serviceRest<Array<{ status: string; generation_cost_usd: number }>>(
    `daily_drops?id=eq.${dropId}&select=status,generation_cost_usd`,
  );
  if (drops.length !== 1 || drops[0].status !== "quarantined")
    throw Error("Only the reviewed quarantined drop may be recovered.");
  const stored = await serviceRest<Array<{ id: string; display_script: string; status: string }>>(
    `pundit_variants?drop_id=eq.${dropId}&pundit_id=eq.zen&select=id,display_script,status`,
  );
  if (
    stored.length !== 1 ||
    stored[0].status !== "quarantined" ||
    hash(stored[0].display_script) !== manifest.originalScriptSha256
  )
    throw Error("Saved script changed since review.");
  const preflight = await runtime(
    `/api/internal/preflight?date=${coverageDate}&matchId=${manifest.matchId}`,
  );
  if (!preflight.ready || !preflight.publicationEnabled || preflight.prelaunchMode)
    throw Error("Production preflight is not ready.");
  const { pack, claims } = await loadSealedEvidence(dropId);
  if (pack.matchId !== manifest.matchId) throw Error("Sealed match mismatch.");
  const originalitySources = await loadRightsClearedOriginalityCorpus();
  const hard = runHardGates({
    candidate,
    pack,
    claims,
    originalitySources,
    originalitySimilarity: maxSourceSimilarity(candidate.displayScript, originalitySources),
  });
  report.hardChecks = hard;
  if (hard.some((item) => !item.passed)) throw Error("Free publication gates refused the repair.");
  // An INSERT with a unique key, rather than the retrying claim RPC, means a
  // failed paid review cannot silently be dispatched a second time.
  const runs = await serviceRest<Array<{ id: string }>>("editorial_runs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      idempotency_key: `approved-recovery:${dropId}:${hash(candidate.displayScript)}`,
      coverage_date: coverageDate,
      mode: "publication",
      status: "running",
      harness_version: "pundit-v1",
      match_id: manifest.matchId,
      request_id: process.env.GITHUB_RUN_ID ?? "operator-recovery",
      started_at: new Date().toISOString(),
    },
  });
  runId = runs[0]?.id;
  if (!runId) throw Error("Recovery was not claimed.");
  const judged = await onOwnMeter(1, () => judgeCandidate({ candidate, pack, claims }));
  report.costUsd = judged.costUsd;
  report.editorialChecks = judged.result;
  const results = [...hard, ...judged.result];
  if (!publicationDecision(results).publishable)
    throw Error("Independent editorial checks refused the repair.");
  const prior = await serviceRest<Array<{ attempt: number; result: HarnessResult }>>(
    `harness_runs?variant_id=eq.${stored[0].id}&select=attempt,result&order=attempt.asc`,
  );
  const attempts = [...new Set(prior.map((row) => row.attempt))];
  const attempt = Math.max(0, ...attempts) + 1;
  const persisted = await persistEditorialRehearsal({
    coverageDate,
    pack,
    claims,
    variants: [
      {
        candidate,
        status: "approved",
        attempts: attempt,
        costUsd: Number(drops[0].generation_cost_usd ?? 0) + judged.costUsd,
        results,
        attemptResults: [
          ...attempts.map((value) => ({
            attempt: value,
            results: prior.filter((row) => row.attempt === value).map((row) => row.result),
          })),
          { attempt, results },
        ],
      },
    ],
  });
  if (persisted.dropId !== dropId || persisted.approvedPundits.join() !== "zen")
    throw Error("Recovery persistence mismatch.");
  const variantId = persisted.variantIds[0].variantId;
  report.variantId = variantId;
  report.production = await runtime("/api/internal/produce-variant", { variantId });
  if (!(report.production as { passed: boolean }).passed)
    throw Error("Audio production refused the edition.");
  report.publication = await runtime(`/api/internal/publish-drop?dropId=${dropId}`, {});
  report.published = true;
  await finishRun({
    runId,
    status: "passed",
    matchId: manifest.matchId,
    promiseChecks: {
      passed: true,
      recovery: report,
      spend: { totalUsd: judged.costUsd, byPundit: { zen: judged.costUsd } },
    },
  });
} catch (error) {
  report.failure = error instanceof Error ? error.message : "Recovery failed closed.";
  if (runId)
    await finishRun({
      runId,
      status: "quarantined",
      matchId: manifest.matchId,
      promiseChecks: report,
      failure: String(report.failure),
    });
  process.exitCode = 1;
} finally {
  await writeFile("recovery-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
