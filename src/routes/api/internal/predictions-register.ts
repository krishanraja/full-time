import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  if (process.env.ENABLE_PREDICTION_REGISTRATION !== "true") {
    return Response.json({ error: "Prediction registration is disabled." }, { status: 409 });
  }
  try {
    const { registerUpcomingPredictions } =
      await import("@/lib/pundit/prediction-orchestrator.server");
    return Response.json(await registerUpcomingPredictions());
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "prediction_registration_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ error: "Prediction registration failed closed." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/internal/predictions-register")({
  server: { handlers: { GET: handle, POST: handle } },
});
