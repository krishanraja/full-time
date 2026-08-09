// /llms.txt - the llmstxt.org convention: one markdown file that tells an
// LLM what this site is, what is on it, and where the canonical copies live,
// without it having to crawl and guess.
//
// Named `llms[.]txt.ts` for the same reason as sitemap[.]xml.ts and
// feed[.]rss.ts: TanStack Router's file-based routing turns a bare "." into
// a "/" path segment, and the convention requires the literal /llms.txt.
//
// Episode entries are generated from real `episodes` rows, never hardcoded,
// under the same filters as the sitemap and the RSS feed (published, with
// real audio) so this file can never advertise a page that 404s.

import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-url";
import type { Database } from "@/integrations/supabase/types";

// Enough for an agent to understand the shape and recency of the catalogue.
// The full list is the sitemap's job; this file is an orientation document.
const EPISODE_LIMIT = 50;

type Row = {
  id: string;
  hook: string;
  published_at: string;
  matches: {
    home_score: number | null;
    away_score: number | null;
    home: { name: string } | null;
    away: { name: string } | null;
    leagues: { name: string } | null;
  } | null;
};

function episodeLine(row: Row): string {
  const m = row.matches;
  const home = m?.home?.name ?? "Unknown home team";
  const away = m?.away?.name ?? "Unknown away team";
  const score = `${m?.home_score ?? 0}-${m?.away_score ?? 0}`;
  const league = m?.leagues?.name;
  const date = row.published_at.slice(0, 10);
  const label = `${home} ${score} ${away}`;
  const context = [league, date].filter(Boolean).join(", ");
  // Single-line entries: llms.txt readers expect `- [name](url): notes`.
  const hook = row.hook.replace(/\s+/g, " ").trim();
  return `- [${label}](${SITE_URL}/episode/${row.id}) (${context}): ${hook}`;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        // Publishable key under RLS, not the service role: a crawler-facing
        // endpoint has no business holding an RLS bypass. Same shape as the
        // sitemap handler and feed.functions.ts's publicClient().
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await sb
          .from("episodes")
          .select(
            "id, hook, published_at, matches!inner(home_score, away_score, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
          )
          .eq("status", "published")
          .not("audio_url", "is", null)
          .order("published_at", { ascending: false })
          .limit(EPISODE_LIMIT);

        // Degrade rather than 500: the orientation half of this file is
        // still useful with an empty episode list, whereas an error page
        // teaches the agent the URL is broken.
        const rows = error ? [] : ((data ?? []) as unknown as Row[]);
        if (error) console.error("[llms.txt] episode query failed:", error.message);

        const body = [
          "# Full Time",
          "",
          "> Daily AI-narrated football recaps. Big Five leagues, about 60 seconds each.",
          "",
          "Full Time turns each day's notable matches into a short narrated audio recap.",
          "Episodes are generated from match data and published as a podcast feed. Every",
          "episode page carries the full narration transcript as text, so the content is",
          "readable without playing the audio.",
          "",
          `Canonical origin: ${SITE_URL}`,
          "Language: en. Publisher: Full Time.",
          "",
          "## Key surfaces",
          "",
          `- [Today](${SITE_URL}/): the current drop, newest first.`,
          `- [Archive](${SITE_URL}/archive): request a narrated recap for a past match.`,
          `- [Podcast RSS feed](${SITE_URL}/api/public/feed.rss): every published episode with audio enclosures and transcripts.`,
          `- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL.`,
          `- [Waitlist](${SITE_URL}/waitlist): what the full product will do.`,
          "",
          "## Recent episodes",
          "",
          rows.length
            ? rows.map(episodeLine).join("\n")
            : "No published episodes with audio right now.",
          "",
          "## Notes for agents",
          "",
          "- Scores, team names and competitions come from match data, not from the narration.",
          "- The transcript on an episode page is the verbatim narration script, not a summary.",
          "- Personalised surfaces (/settings, /following, /auth) are noindex and carry no public content.",
          "",
        ].join("\n");

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            // Cheap for crawlers to re-check; the drop changes once a day.
            "Cache-Control": "public, max-age=600, s-maxage=3600",
          },
        });
      },
    },
  },
});
