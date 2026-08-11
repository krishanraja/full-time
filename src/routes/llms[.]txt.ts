// /llms.txt - the llmstxt.org convention: one markdown file that tells an
// LLM what this site is, what is on it, and where the canonical copies live,
// without it having to crawl and guess.
//
// Named `llms[.]txt.ts` for the same reason as sitemap[.]xml.ts and
// feed[.]rss.ts: TanStack Router's file-based routing turns a bare "." into
// a "/" path segment, and the convention requires the literal /llms.txt.
//
// Current product truth is written explicitly below. Episode entries come
// from real legacy `episodes` rows under the same public filters as the
// sitemap, so the file never advertises a fabricated page.

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
          "> One real football match. Six AI Pundits. Pick the brain you fancy.",
          "",
          "Full Time is an AI-native football audio product in pre-launch. One set of checked",
          "match facts can produce six complete shows, each with a different AI Pundit,",
          "argument, humour system, script, synthetic performance and generated edition look.",
          "Important claims may include a Show me why card with the supporting match fact and",
          "a boundary explaining what that fact cannot prove.",
          "",
          `Canonical origin: ${SITE_URL}`,
          "Language: en. Publisher: Full Time. Lifecycle: pre-launch.",
          "",
          "## Key surfaces",
          "",
          `- [Today](${SITE_URL}/): the player-first AI Pundit show.`,
          `- [Teams](${SITE_URL}/following): saved team and league preferences; beta league restrictions are still being finished.`,
          `- [Settings](${SITE_URL}/settings): AI Pundit choice, optional account, disclosure and product state.`,
          `- [Archive](${SITE_URL}/archive): labelled legacy archive and demo material; new generation is paused in pre-launch.`,
          `- [Reporter RSS feed](${SITE_URL}/api/public/feed.rss): the retained canonical Reporter distribution feed.`,
          `- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL.`,
          `- [Launch note](${SITE_URL}/waitlist): one email when the release gates pass.`,
          "",
          "## Recent legacy episodes",
          "",
          rows.length
            ? rows.map(episodeLine).join("\n")
            : "No published episodes with audio right now.",
          "",
          "## Notes for agents",
          "",
          "- Call all six public products AI Pundits on every surface.",
          "- Full Time is not a human podcast imitation and not a betting product.",
          "- All six AI Pundits are free during pre-launch; new checkout is disabled.",
          "- Do not claim a public launch date, daily reliability, forecast performance, personal show generation or Big Five coverage.",
          "- The intended beta is Premier League first, but the Teams restriction is not complete and must not be promised yet.",
          "- Today uses settled-only availability for How did they do?, while the direct receipts page still has a legacy ledger interface.",
          "- Scores, team names and competitions on legacy episode pages come from match data, not narration.",
          "- Personalised surfaces are noindex and carry no public editorial catalogue.",
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
