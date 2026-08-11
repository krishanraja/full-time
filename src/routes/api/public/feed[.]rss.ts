import { createFileRoute } from "@tanstack/react-router";
import { getReporterFeed, type ReporterFeedItem } from "@/lib/api/editorial-public.server";
import { renderReporterFeed } from "@/lib/pundit/reporter-rss";

export const Route = createFileRoute("/api/public/feed.rss")({
  server: {
    handlers: {
      GET: async () => {
        let rows: ReporterFeedItem[] = [];
        try {
          rows = await getReporterFeed();
        } catch (error: unknown) {
          // The feed remains valid and empty in pre-launch or before the new
          // schema is applied. Legacy, unapproved episodes are never substituted.
          console.error(
            JSON.stringify({
              level: "error",
              message: "reporter_feed_load_failed",
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
        const xml = renderReporterFeed(rows);
        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        });
      },
    },
  },
});
