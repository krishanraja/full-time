import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const revision =
    url.searchParams.get("revision") ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    "";
  try {
    const readiness = await import("@/lib/pundit/release-readiness.server");
    if (request.method === "POST") {
      if (process.env.ENABLE_RELEASE_SNAPSHOT_WRITE !== "true") {
        return Response.json({ error: "Release snapshot writes are disabled." }, { status: 409 });
      }
      return Response.json(await readiness.persistPassingReleaseSnapshot(revision));
    }
    return Response.json(await readiness.evaluateReleaseReadiness(revision));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 409 },
    );
  }
}

export const Route = createFileRoute("/api/internal/release-readiness")({
  server: { handlers: { GET: handle, POST: handle } },
});
