import { createFileRoute } from "@tanstack/react-router";
import { PUNDIT_SPECS } from "@/lib/pundit/specs";
import { PUNDIT_IDS } from "@/lib/pundit/types";

export const Route = createFileRoute("/api/public/pundits")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          PUNDIT_IDS.map((id) => {
            const spec = PUNDIT_SPECS[id];
            return {
              id,
              version: spec.version,
              name: spec.name,
              lens: spec.lens,
              humour: spec.humourMechanisms,
              delivery: spec.performance.direction,
              predictionStyle: spec.predictionStyle,
              free: true,
            };
          }),
          { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
        ),
    },
  },
});
