// Public podcast RSS feed (RSS 2.0 + itunes namespace).
// File is named `feed[.]rss.ts` so TanStack Router's file-based routing
// (which otherwise turns a bare "." into a "/" path segment) treats the dot
// as literal, producing the URL /api/public/feed.rss, the conventional
// extension podcast directories and validators expect. Same public/no-auth
// posture as cron.daily-drop.ts's data reads: this is read-only, published
// data, no secrets.
//
// Renders straight from the `episodes` table (joined to matches/teams/
// leagues for the scoreline + competition name). Never invents an episode:
// every <item> is a real row with a real audio_url.

import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, DEFAULT_COVER_IMAGE_URL } from "@/lib/site-url";

const FEED_LIMIT = 100;

type EpisodeRow = {
  id: string;
  title: string;
  hook: string;
  script: string;
  duration_sec: number;
  audio_url: string | null;
  audio_bytes: number | null;
  og_image_url: string | null;
  published_at: string;
  matches: {
    home_score: number | null;
    away_score: number | null;
    leagues: { name: string } | null;
    home: { name: string } | null;
    away: { name: string } | null;
  } | null;
};

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// OP3 (op3.dev) is an open, privacy-respecting podcast analytics prefix. Wrapping
// the enclosure URL routes each download through OP3 (which counts it, then
// redirects to the real file), giving Full Time real download numbers that Apple
// and Spotify never expose. Scheme is stripped per OP3's convention.
function op3Wrap(url: string): string {
  return `https://op3.dev/e/${url.replace(/^https?:\/\//, "")}`;
}

function durationHhMmSs(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function itemXml(row: EpisodeRow): string {
  const home = row.matches?.home?.name ?? null;
  const away = row.matches?.away?.name ?? null;
  const homeScore = row.matches?.home_score;
  const awayScore = row.matches?.away_score;
  const scoreline =
    home && away && homeScore != null && awayScore != null
      ? `${home} ${homeScore}-${awayScore} ${away}`
      : null;
  const title = row.title || scoreline || "Full Time recap";
  const description = [row.hook, row.script].filter(Boolean).join("\n\n");
  const episodeUrl = `${SITE_URL}/episode/${row.id}`;
  const imageUrl = row.og_image_url ?? DEFAULT_COVER_IMAGE_URL;
  // audio_bytes is backfilled on all existing rows and set by the pipeline
  // on every new one (see episode-pipeline.functions.ts); 0 is a rare,
  // honest "unknown" fallback rather than a fabricated size.
  const lengthBytes = row.audio_bytes ?? 0;

  return [
    "<item>",
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(episodeUrl)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<guid isPermaLink="false">${escapeXml(row.id)}</guid>`,
    `<pubDate>${new Date(row.published_at).toUTCString()}</pubDate>`,
    row.audio_url
      ? `<enclosure url="${escapeXml(op3Wrap(row.audio_url))}" type="audio/mpeg" length="${lengthBytes}" />`
      : "",
    `<itunes:title>${escapeXml(title)}</itunes:title>`,
    `<itunes:summary>${escapeXml(description)}</itunes:summary>`,
    `<itunes:duration>${durationHhMmSs(row.duration_sec)}</itunes:duration>`,
    `<itunes:image href="${escapeXml(imageUrl)}" />`,
    "<itunes:explicit>false</itunes:explicit>",
    "<itunes:episodeType>full</itunes:episodeType>",
    "</item>",
  ]
    .filter(Boolean)
    .join("");
}

export const Route = createFileRoute("/api/public/feed.rss")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data, error } = await supabaseAdmin
          .from("episodes")
          .select(
            "id, title, hook, script, duration_sec, audio_url, audio_bytes, og_image_url, published_at, matches!inner(home_score, away_score, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
          )
          .eq("status", "published")
          .not("audio_url", "is", null)
          .order("published_at", { ascending: false })
          .limit(FEED_LIMIT);

        if (error) return new Response(error.message, { status: 500 });

        const rows = (data ?? []) as unknown as EpisodeRow[];
        const feedUrl = `${SITE_URL}/api/public/feed.rss`;
        const lastBuildDate = (rows[0] ? new Date(rows[0].published_at) : new Date()).toUTCString();

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">',
          "<channel>",
          "<title>Full Time</title>",
          `<link>${SITE_URL}</link>`,
          `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
          "<description>Daily AI-narrated football recaps. Big 5 leagues, checked against the facts before you hear it.</description>",
          "<language>en-us</language>",
          `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
          "<itunes:author>Full Time</itunes:author>",
          "<itunes:type>episodic</itunes:type>",
          "<itunes:explicit>false</itunes:explicit>",
          `<itunes:image href="${DEFAULT_COVER_IMAGE_URL}" />`,
          "<itunes:owner>",
          "<itunes:name>Full Time</itunes:name>",
          // TODO(krish): placeholder support inbox. _STATE.md's own GTM audit
          // flags "support inbox" as an open item -- swap this for a real,
          // monitored address before submitting to Apple/Spotify.
          "<itunes:email>hello@krishraja.com</itunes:email>",
          "</itunes:owner>",
          '<itunes:category text="Sports">',
          '<itunes:category text="Soccer" />',
          "</itunes:category>",
          ...rows.map(itemXml),
          "</channel>",
          "</rss>",
        ].join("");

        return new Response(xml, {
          status: 200,
          headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
        });
      },
    },
  },
});
