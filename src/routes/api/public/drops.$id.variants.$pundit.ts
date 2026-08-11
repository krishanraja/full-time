import { createFileRoute } from "@tanstack/react-router";
import {
  getPublicVariant,
  isValidDropId,
  parsePunditId,
} from "@/lib/api/editorial-public.server";

export const Route = createFileRoute("/api/public/drops/$id/variants/$pundit")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const pundit = parsePunditId(params.pundit);
        if (!pundit) return Response.json({ error: "Unknown pundit." }, { status: 400 });
        if (!isValidDropId(params.id)) {
          return Response.json({ error: "Invalid drop id." }, { status: 400 });
        }
        const variant = await getPublicVariant(params.id, pundit);
        return variant
          ? Response.json(variant, { headers: { "Cache-Control": "public, max-age=300" } })
          : Response.json({ error: "Published variant not found." }, { status: 404 });
      },
    },
  },
});
