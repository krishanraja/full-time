import { addCalendarDays, londonDayBounds, londonLocalTime } from "@/lib/london-date";
import { runPrivatePunditRehearsal } from "./pundit-rehearsal.server";
import { serviceRest, serviceRpc } from "./service-rest.server";

export type RunMode = "full_rehearsal" | "publication";

type EditorialRunRow = {
  id: string;
  status: string;
};

function assertCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Coverage date must be YYYY-MM-DD.");
  return value;
}

export async function claimRun(input: {
  coverageDate: string;
  mode: RunMode;
  requestId?: string | null;
}) {
  const key = `pundit-v1:${input.coverageDate}:${input.mode}`;
  const rows = await serviceRpc<EditorialRunRow[]>("claim_editorial_run", {
    target_key: key,
    target_coverage_date: input.coverageDate,
    target_mode: input.mode,
    target_harness_version: "pundit-v1",
    target_request_id: input.requestId ?? null,
  });
  return rows[0] ?? null;
}

export async function selectFeatureMatch(coverageDate: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bounds = londonDayBounds(coverageDate);
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id, importance_score, kickoff_at")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .gte("kickoff_at", bounds.start.toISOString())
    .lt("kickoff_at", bounds.end.toISOString())
    .order("importance_score", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const candidates = data ?? [];
  if (!candidates.length) throw new Error(`No finished match is available for ${coverageDate}.`);
  const { data: contexts, error: contextError } = await supabaseAdmin
    .from("match_context")
    .select("match_id, feeds_agree")
    .in(
      "match_id",
      candidates.map((match) => match.id),
    );
  if (contextError) throw new Error(contextError.message);
  const agreement = new Map((contexts ?? []).map((row) => [row.match_id, row.feeds_agree]));
  const selected = candidates.find((match) => agreement.get(match.id) !== false);
  if (!selected) throw new Error("Every candidate match failed the independent score cross-check.");
  return selected.id;
}

export async function finishRun(input: {
  runId: string;
  status: "passed" | "quarantined" | "failed";
  matchId?: string;
  promiseChecks?: unknown;
  failure?: string;
}) {
  await serviceRest<null>(`editorial_runs?id=eq.${encodeURIComponent(input.runId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: input.status,
      match_id: input.matchId,
      promise_checks: input.promiseChecks ?? {},
      failure: input.failure ?? null,
      finished_at: new Date().toISOString(),
    },
  });
}

export async function recordRehearsal(input: {
  runId: string;
  coverageDate: string;
  dropId?: string;
  successfulVariants: number;
  promiseChecks: unknown;
  passed: boolean;
}) {
  const deadline = londonLocalTime(addCalendarDays(input.coverageDate, 1), 6, 45);
  await serviceRest<null>("rehearsal_runs?on_conflict=coverage_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      editorial_run_id: input.runId,
      coverage_date: input.coverageDate,
      drop_id: input.dropId,
      successful_variants: input.successfulVariants,
      deadline_at: deadline.toISOString(),
      completed_at: new Date().toISOString(),
      promise_checks: input.promiseChecks,
      passed: input.passed && Date.now() <= deadline.getTime(),
    },
  });
}

export async function runDailyPunditPipeline(input: {
  coverageDate: string;
  mode: RunMode;
  requestId?: string | null;
}) {
  const coverageDate = assertCoverageDate(input.coverageDate);
  const run = await claimRun({ ...input, coverageDate });
  if (!run) return { skipped: true, reason: "An idempotent run is already active or passed." };

  let matchId: string | undefined;
  try {
    matchId = await selectFeatureMatch(coverageDate);
    const result = await runPrivatePunditRehearsal(matchId, { includeAudio: true });
    const successfulVariants = result.variants.filter(
      (variant) => variant.production?.passed === true,
    ).length;
    const passed = result.status === "approved" && result.promise?.passed === true;
    if (!passed) {
      await finishRun({
        runId: run.id,
        status: "quarantined",
        matchId,
        promiseChecks: result.promise,
        failure: "Six-variant promise checks failed.",
      });
      if (input.mode === "full_rehearsal") {
        await recordRehearsal({
          runId: run.id,
          coverageDate,
          dropId: result.dropId,
          successfulVariants,
          promiseChecks: result.promise,
          passed: false,
        });
      }
      return { ...result, published: false };
    }

    let publication: unknown = null;
    if (input.mode === "publication") {
      publication = await serviceRpc("publish_daily_drop", { target_drop_id: result.dropId });
    }
    await finishRun({
      runId: run.id,
      status: "passed",
      matchId,
      promiseChecks: result.promise,
    });
    if (input.mode === "full_rehearsal") {
      await recordRehearsal({
        runId: run.id,
        coverageDate,
        dropId: result.dropId,
        successfulVariants,
        promiseChecks: result.promise,
        passed: true,
      });
    }
    return { ...result, published: input.mode === "publication", publication };
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    await finishRun({ runId: run.id, status: "failed", matchId, failure });
    if (input.mode === "full_rehearsal") {
      await recordRehearsal({
        runId: run.id,
        coverageDate,
        successfulVariants: 0,
        promiseChecks: { passed: false, failure },
        passed: false,
      });
    }
    throw error;
  }
}
