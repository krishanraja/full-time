// Daily-drop cron endpoint.
// Called once per morning by GitHub Actions (or pg_cron). Auth uses
// Supabase publishable/anon key in `apikey` header, per /api/public/*
// pattern. Idempotent: skips matches that already have an episode.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/daily-drop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? "";
        if (!expectedKey || provided !== expectedKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find yesterday's finished matches that lack an episode
        const since = new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString();
        const { data: matches, error } = await supabaseAdmin
          .from("matches")
          .select("id, home_score, away_score, importance_score, kickoff_at")
          .eq("status", "finished")
          .gte("kickoff_at", since)
          .order("importance_score", { ascending: false })
          .limit(8);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const { generateEpisodeForMatch } = await import(
          "@/lib/api/episode-pipeline.functions"
        );

        const results: Array<{ matchId: string; ok: boolean; error?: string }> = [];
        for (const m of matches ?? []) {
          try {
            // call the server fn handler directly
            // @ts-expect-error — server fn callable on server
            const r = await generateEpisodeForMatch({ data: { matchId: m.id } });
            results.push({ matchId: m.id, ok: true, ...r });
          } catch (err) {
            console.error("[cron] match failed", m.id, err);
            results.push({
              matchId: m.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        // Web push fan-out (only if VAPID configured + any new episodes)
        const created = results.filter((r) => r.ok).length;
        if (created > 0) {
          try {
            const { fanoutMorningPush } = await import("@/lib/api/push-fanout.server");
            await fanoutMorningPush(created);
          } catch (err) {
            console.warn("[cron] push fanout failed (non-fatal)", err);
          }
        }

        return Response.json({
          processed: results.length,
          created,
          results,
        });
      },
    },
  },
});
