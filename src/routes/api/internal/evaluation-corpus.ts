import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/internal/evaluation-corpus")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        if (process.env.ENABLE_EVALUATION_RUNS !== "true") {
          return Response.json({ error: "Evaluation operations are disabled." }, { status: 409 });
        }
        try {
          const { buildEvaluationCorpus } = await import("@/lib/pundit/evaluation-corpus.server");
          return Response.json(await buildEvaluationCorpus());
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "evaluation_corpus_failed",
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json(
            { error: "Evaluation corpus build failed closed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
