import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";
import { currentCoverageDate } from "@/lib/london-date";

async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const prelaunch = process.env.PRELAUNCH_MODE !== "false";
  if (prelaunch && process.env.ENABLE_PRIVATE_REHEARSALS !== "true") {
    return Response.json({ error: "Private rehearsals are disabled." }, { status: 409 });
  }
  if (!prelaunch && process.env.PUNDIT_PUBLICATION_ENABLED !== "true") {
    return Response.json({ error: "Pundit publication is disabled." }, { status: 409 });
  }
  const url = new URL(request.url);
  const requestedRunId = url.searchParams.get("runId");
  if (requestedRunId) {
    const { getRun } = await import("workflow/api");
    const run = getRun(requestedRunId);
    if (!(await run.exists)) {
      return Response.json({ error: "Workflow run not found." }, { status: 404 });
    }
    return Response.json({
      runId: requestedRunId,
      status: await run.status,
      workflowName: await run.workflowName,
      createdAt: (await run.createdAt).toISOString(),
      startedAt: (await run.startedAt)?.toISOString() ?? null,
      completedAt: (await run.completedAt)?.toISOString() ?? null,
    });
  }
  const coverageDate = url.searchParams.get("date") ?? currentCoverageDate();
  const mode = prelaunch ? "full_rehearsal" : "publication";
  const requestId = request.headers.get("x-vercel-id");
  console.log(
    JSON.stringify({
      level: "info",
      message: "daily_pundit_pipeline_started",
      requestId,
      coverageDate,
      mode,
    }),
  );
  try {
    const [{ start }, { dailyPunditWorkflow }] = await Promise.all([
      import("workflow/api"),
      import("@/workflows/daily-pundit"),
    ]);
    // A fresh token per dispatch, so re-running a date starts a new durable run
    // rather than replaying the previous one's completed steps.
    const runToken = url.searchParams.get("token") ?? new Date().toISOString();
    // An explicit match overrides the day's importance ranking.
    const matchId = url.searchParams.get("matchId") ?? undefined;
    // A comma-separated subset writes only those pundits. A diagnostic run of
    // one costs about a sixth of a full show and proves a fix just as well; it
    // cannot publish, because a drop holding fewer than six variants fails the
    // six-variant promise downstream.
    const punditIds = (url.searchParams.get("pundits") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) as Parameters<typeof dailyPunditWorkflow>[0]["punditIds"];
    const run = await start(dailyPunditWorkflow, [
      { coverageDate, mode, runToken, matchId, punditIds: punditIds?.length ? punditIds : undefined },
    ]);
    console.log(
      JSON.stringify({
        level: "info",
        message: "daily_pundit_workflow_enqueued",
        requestId,
        coverageDate,
        mode,
        workflowRunId: run.runId,
      }),
    );
    return Response.json(
      {
        accepted: true,
        runId: run.runId,
        statusUrl: `/api/internal/daily-rehearsal?runId=${encodeURIComponent(run.runId)}`,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "daily_pundit_pipeline_failed",
        requestId,
        coverageDate,
        mode,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ error: "Daily pundit pipeline failed closed." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/internal/daily-rehearsal")({
  server: { handlers: { GET: handle, POST: handle } },
});
