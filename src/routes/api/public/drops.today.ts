import { createFileRoute } from "@tanstack/react-router";
import { getPublicToday, isValidDropId, parsePunditId } from "@/lib/api/editorial-public.server";

export const Route = createFileRoute("/api/public/drops/today")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const pundit = parsePunditId(params.get("pundit")) ?? "zen";
        // A shared link opens on its own match, when that match is still one
        // Today can show. Anything else falls back to the newest one.
        const drop = params.get("drop");
        try {
          const response = await getPublicToday(
            pundit,
            drop && isValidDropId(drop) ? drop : undefined,
          );
          return Response.json(response, {
            headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
          });
        } catch (error: unknown) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "public_today_failed",
              pundit,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return Response.json({ error: "Current drop is unavailable." }, { status: 503 });
        }
      },
    },
  },
});
