import { createFileRoute } from "@tanstack/react-router";
import { isCronAuthorized } from "@/lib/cron-auth";

// Variant production needs native modules (sharp for share cards, ffmpeg for
// mastering) that only exist in the traced Nitro server function. The durable
// Workflow step functions are a single bundle on a different CPU architecture
// with no node_modules, so the workflow calls this route instead of importing
// the production module directly.
async function handle({ request }: { request: Request }) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const started = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  let input: {
    dropId: string;
    coverageDate: string;
    variantId: string;
    generated: unknown;
    entities: string[];
  };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  // A request carrying only a variant id rebuilds the rest from what is stored.
  // That is how a narration is retried after a fault is fixed, and how the
  // production half is rehearsed against a script already paid for.
  if (input?.variantId && !input.generated) {
    try {
      const { rehydrateVariantForProduction } = await import(
        "@/lib/pundit/variant-rehydrate.server"
      );
      input = await rehydrateVariantForProduction(input.variantId);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 },
      );
    }
  }
  if (!input?.dropId || !input.variantId || !input.coverageDate || !input.generated) {
    return Response.json(
      { error: "dropId, coverageDate, variantId and generated are required." },
      {
        status: 400,
      },
    );
  }
  try {
    const { producePunditVariant } = await import("@/lib/pundit/variant-production.server");
    const result = await producePunditVariant({
      dropId: input.dropId,
      coverageDate: input.coverageDate,
      variantId: input.variantId,
      generated: input.generated as Parameters<typeof producePunditVariant>[0]["generated"],
      entities: Array.isArray(input.entities) ? input.entities : [],
    });
    console.log(
      JSON.stringify({
        level: "info",
        message: "variant_production_completed",
        requestId,
        dropId: input.dropId,
        punditId: result.punditId,
        passed: result.passed,
        durationMs: Date.now() - started,
      }),
    );
    return Response.json(result);
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "variant_production_failed",
        requestId,
        dropId: input.dropId,
        variantId: input.variantId,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ error: "Variant production failed closed." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/internal/produce-variant")({
  server: { handlers: { POST: handle } },
});
