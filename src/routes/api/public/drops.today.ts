import { createFileRoute } from "@tanstack/react-router";
import { getPublicToday, parsePunditId } from "@/lib/api/editorial-public.server";

export const Route = createFileRoute("/api/public/drops/today")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const pundit = parsePunditId(new URL(request.url).searchParams.get("pundit")) ?? "zen";
        try {
          const response = await getPublicToday(pundit);
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
