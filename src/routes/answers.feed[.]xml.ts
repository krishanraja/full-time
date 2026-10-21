// /answers/feed.xml - Atom 1.0 feed of the answer hub, newest first.
// Named with `[.]` for the same reason as sitemap[.]xml.ts: a bare "." would
// become a path segment. Static: built from the post files, no database.

import { createFileRoute } from "@tanstack/react-router";
import { answersFeedXml } from "@/lib/answers";

export const Route = createFileRoute("/answers/feed.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(answersFeedXml(), {
          status: 200,
          headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=3600",
          },
        }),
    },
  },
});
