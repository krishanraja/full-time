// Public XML sitemap (sitemaps.org 0.9).
// File is named `sitemap[.]xml.ts` for the same reason as feed[.]rss.ts:
// TanStack Router's file-based routing otherwise turns a bare "." into a "/"
// path segment, and crawlers expect the literal /sitemap.xml. Referenced from
// public/robots.txt.
//
// Static entries are the real public surfaces (home/today, archive, waitlist).
// Episode entries are generated from real `episodes` rows, never hardcoded, so
// the sitemap can never advertise a share page that would 404. Same filters as
// the RSS feed: published rows with real audio.

import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-url";
import type { Database } from "@/integrations/supabase/types";

// Sitemaps.org caps a single file at 50,000 URLs. There are 8 episodes today,
// so this is a guard rail rather than a live constraint; if the pipeline ever
// outgrows it the next step is a sitemap index, not a bigger number.
const EPISODE_LIMIT = 5000;

type EpisodeRow = { id: string; published_at: string };

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// <lastmod> accepts W3C Datetime; date-only is the common, unambiguous form.
function lastmodDate(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function urlXml(path: string, lastmod: string | null): string {
  return [
    "<url>",
    `<loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Public, published rows only, so this reads with the publishable key
        // under RLS rather than the service role: a crawler-facing endpoint
        // has no business holding an RLS bypass. Same client shape as
        // feed.functions.ts's publicClient(). Imported inside the handler so
        // supabase-js never lands in the client bundle.
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await sb
          .from("episodes")
          .select("id, published_at")
          .eq("status", "published")
          .not("audio_url", "is", null)
          .order("published_at", { ascending: false })
          .limit(EPISODE_LIMIT);

        // Degrade rather than 500: a sitemap listing only the static routes is
        // still a valid, useful sitemap, whereas an error page teaches the
        // crawler the URL is broken.
        const rows = error ? [] : ((data ?? []) as EpisodeRow[]);
        if (error) console.error("[sitemap] episode query failed:", error.message);

        // The home and archive surfaces both re-render whenever a new episode
        // publishes, so the newest episode's date is their honest lastmod.
        // /waitlist is static copy, so it gets no lastmod rather than a guess.
        const newestEpisodeDate = rows[0] ? lastmodDate(rows[0].published_at) : null;

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          urlXml("/", newestEpisodeDate),
          urlXml("/archive", newestEpisodeDate),
          urlXml("/waitlist", null),
          ...rows.map((row) => urlXml(`/episode/${row.id}`, lastmodDate(row.published_at))),
          "</urlset>",
        ].join("");

        return new Response(xml, {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
