import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/internal/rehearsal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        if (process.env.ENABLE_PRIVATE_REHEARSALS !== "true") {
          return Response.json({ error: "Private rehearsals are disabled." }, { status: 409 });
        }
        const matchId = new URL(request.url).searchParams.get("matchId");
        if (!matchId) return Response.json({ error: "matchId is required." }, { status: 400 });
        const started = Date.now();
        const requestId = request.headers.get("x-vercel-id");
        console.log(
          JSON.stringify({ level: "info", message: "rehearsal_started", requestId, matchId }),
        );
        try {
          const result = await (
            await import("@/lib/pundit/pundit-rehearsal.server")
          ).runPrivatePunditRehearsal(matchId);
          console.log(
            JSON.stringify({
              level: "info",
              message: "rehearsal_completed",
              requestId,
              matchId,
              durationMs: Date.now() - started,
              status: result.status,
            }),
          );
          return Response.json(result);
        } catch (error: unknown) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "rehearsal_failed",
              requestId,
              matchId,
              durationMs: Date.now() - started,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json({ error: "Rehearsal failed closed." }, { status: 500 });
        }
      },
    },
  },
});
