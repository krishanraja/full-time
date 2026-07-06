// Daily-drop cron endpoint.
// Called once per morning (GitHub Actions or a Vercel cron). Auth: a
// CRON_SECRET bearer token when configured (Vercel cron and GitHub Actions
// both send it), falling back to the Supabase publishable key for backward
// compatibility. Idempotent: skips matches that already have an episode.
//
// Scale: generation is heavy (Opus writer + Sonnet judge + TTS, ~15-40s each),
// so matches run with bounded concurrency under a wall-clock budget to stay
// within the serverless function timeout. Anything not reached is picked up on
// the next run (idempotency makes that safe).

import { createFileRoute } from "@tanstack/react-router";

const CONCURRENCY = 3;
const BUDGET_MS = 240_000; // stay under the 300s function limit

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth === `Bearer ${secret}`) return true;
  }
  // Backward-compatible fallback: Supabase publishable key in `apikey`.
  const expectedKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const provided = request.headers.get("apikey") ?? "";
  return !secret && !!expectedKey && provided === expectedKey;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export const Route = createFileRoute("/api/public/cron/daily-drop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find yesterday's finished matches that lack an episode.
        const since = new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString();
        const { data: matches, error } = await supabaseAdmin
          .from("matches")
          .select("id, home_score, away_score, importance_score, kickoff_at")
          .eq("status", "finished")
          .gte("kickoff_at", since)
          .order("importance_score", { ascending: false })
          .limit(8);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const { runEpisodePipeline } = await import("@/lib/api/episode-pipeline.functions");

        const started = Date.now();
        const results = await mapLimit(matches ?? [], CONCURRENCY, async (m) => {
          if (Date.now() - started > BUDGET_MS) {
            return { matchId: m.id, ok: false, error: "skipped: time budget" };
          }
          try {
            const r = await runEpisodePipeline(m.id);
            return { matchId: m.id, ok: true, ...r };
          } catch (err) {
            console.error("[cron] match failed", m.id, err);
            return {
              matchId: m.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });

        // Web push fan-out (only if VAPID configured + any new episodes).
        const created = results.filter((r) => r.ok && !("skipped" in r)).length;
        if (created > 0) {
          try {
            const { fanoutMorningPush } = await import("@/lib/api/push-fanout.server");
            await fanoutMorningPush(created);
          } catch (err) {
            console.warn("[cron] push fanout failed (non-fatal)", err);
          }
        }

        return Response.json({ processed: results.length, created, results });
      },
    },
  },
});
