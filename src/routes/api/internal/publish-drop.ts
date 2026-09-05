import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

// Publication normally happens at the end of a run. It needs a door of its own
// for the case where a drop reached the bar but its run did not carry it over
// the line: a run that died after production, or a variant narrated on its own
// after a fault was fixed.
//
// This adds no authority. It calls the same fail-closed gate, which refuses
// unless the release state is backed by a passing snapshot and at least one
// variant passed every one of its own checks. A drop that should not publish
// still cannot.
async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const dropId = new URL(request.url).searchParams.get("dropId");
  if (!dropId) return Response.json({ error: "dropId is required." }, { status: 400 });
  try {
    const { serviceRpc } = await import("@/lib/pundit/service-rest.server");
    const checks = await serviceRpc("publish_daily_drop", { target_drop_id: dropId });
    console.log(
      JSON.stringify({ level: "info", message: "drop_published", dropId, checks }),
    );
    return Response.json({ published: true, dropId, checks });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 409 },
    );
  }
}

export const Route = createFileRoute("/api/internal/publish-drop")({
  server: { handlers: { POST: handle } },
});
