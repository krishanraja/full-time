// Public XML sitemap (sitemaps.org 0.9).
// File is named `sitemap[.]xml.ts` for the same reason as feed[.]rss.ts:
// TanStack Router's file-based routing otherwise turns a bare "." into a "/"
// path segment, and crawlers expect the literal /sitemap.xml. Referenced from
// public/robots.txt.
//
// Static entries are real indexable public surfaces. `/feed` redirects to
// Today and therefore does not belong in the sitemap.
// Episode entries are generated from real `episodes` rows, never hardcoded, so
// the sitemap can never advertise a share page that would 404. Same filters as
// the RSS feed: published rows with real audio.

import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-url";
import { answerSitemapEntries } from "@/lib/answers";
import type { Database } from "@/integrations/supabase/types";

// Sitemaps.org caps a single file at 50,000 URLs. There are 8 episodes today,
// so this is a guard rail rather than a live constraint; if the pipeline ever
// outgrows it the next step is a sitemap index, not a bigger number.
const EPISODE_LIMIT = 5000;

// The date the static pages were last edited. Every <loc> carries a lastmod;
// a page with no newer signal falls back to this. Change it in the commit
// that edits /waitlist, /pro, /receipts or the legal pages.
const STATIC_PAGES_LASTMOD = "2026-10-19";

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
    `<lastmod>${lastmod ?? STATIC_PAGES_LASTMOD}</lastmod>`,
    "</url>",
  ].join("");
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
        // A missing database config or a thrown client error degrades to the
        // static half too, so the committed answer pages are always listed.
        const rows: EpisodeRow[] = await (async () => {
          try {
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
            if (error) console.error("[sitemap] episode query failed:", error.message);
            return error ? [] : ((data ?? []) as EpisodeRow[]);
          } catch (err) {
            console.error(
              "[sitemap] episode query threw:",
              err instanceof Error ? err.message : err,
            );
            return [];
          }
        })();

        // The home and archive surfaces both re-render whenever a new episode
        // publishes, so the newest episode's date is their honest lastmod.
        // Static pages (/waitlist, /pro, /receipts, legal) take STATIC_PAGES_LASTMOD.
        const newestEpisodeDate = rows[0] ? lastmodDate(rows[0].published_at) : null;

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          urlXml("/", newestEpisodeDate),
          urlXml("/archive", newestEpisodeDate),
          urlXml("/waitlist", null),
          // /pro is a truthful pre-launch and existing-subscriber page. New
          // checkout remains disabled.
          urlXml("/pro", null),
          // Public and indexable, though Today no longer links to it.
          urlXml("/receipts", null),
          // Static copy. Listed because legal pages are a trust signal
          // engines look for, not because they are traffic. /settings, /following and /auth are
          // deliberately absent: they are noindex or personalised.
          urlXml("/legal/privacy", null),
          urlXml("/legal/terms", null),
          // The answer hub: unlinked from the app's navigation, so the sitemap
          // is one of the ways it is found. lastmod is each post's dateModified.
          ...answerSitemapEntries().map((entry) => urlXml(entry.path, entry.lastmod)),
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
