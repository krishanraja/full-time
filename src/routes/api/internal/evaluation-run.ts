import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/internal/evaluation-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        if (process.env.ENABLE_EVALUATION_RUNS !== "true") {
          return Response.json({ error: "Evaluation operations are disabled." }, { status: 409 });
        }
        try {
          const url = new URL(request.url);
          const { runEvaluationBatch } = await import("@/lib/pundit/evaluation-runner.server");
          return Response.json(
            await runEvaluationBatch({
              matchId: url.searchParams.get("matchId") ?? undefined,
              limit: Number(url.searchParams.get("limit") ?? 1),
            }),
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "evaluation_run_failed",
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json({ error: "Evaluation run failed closed." }, { status: 500 });
        }
      },
    },
  },
});
