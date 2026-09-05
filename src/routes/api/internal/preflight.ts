import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";
import { currentCoverageDate } from "@/lib/london-date";

async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  try {
    const { evaluatePreflight } = await import("@/lib/pundit/preflight.server");
    const report = await evaluatePreflight({
      coverageDate: url.searchParams.get("date") ?? currentCoverageDate(),
      matchId: url.searchParams.get("matchId") ?? undefined,
    });
    return Response.json(report, { status: report.ready ? 200 : 409 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/internal/preflight")({
  server: { handlers: { GET: handle, POST: handle } },
});
