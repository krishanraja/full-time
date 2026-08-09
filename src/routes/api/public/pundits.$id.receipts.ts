import { createFileRoute } from "@tanstack/react-router";
import { getPublicPredictions, parsePunditId } from "@/lib/api/editorial-public.server";

export const Route = createFileRoute("/api/public/pundits/$id/receipts")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const pundit = parsePunditId(params.id);
        if (!pundit) return Response.json({ error: "Unknown pundit." }, { status: 400 });
        return Response.json(await getPublicPredictions(pundit, true), {
          headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
        });
      },
    },
  },
});
