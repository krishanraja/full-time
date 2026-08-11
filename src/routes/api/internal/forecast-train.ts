import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/internal/forecast-train")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        if (process.env.ENABLE_FORECAST_TRAINING !== "true") {
          return Response.json({ error: "Forecast training is disabled." }, { status: 409 });
        }
        try {
          const activate = new URL(request.url).searchParams.get("activate") === "1";
          const { trainAndBacktestForecast } =
            await import("@/lib/pundit/forecast-training.server");
          return Response.json(await trainAndBacktestForecast({ activate }));
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "forecast_training_failed",
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json({ error: "Forecast training failed closed." }, { status: 500 });
        }
      },
    },
  },
});
