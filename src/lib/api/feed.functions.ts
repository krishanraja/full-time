import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type FeedEpisode = {
  id: string;
  matchId: string;
  title: string;
  hook: string;
  script: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  durationSec: number;
  badge?: "BIGGEST MOMENT" | "LATE DRAMA" | "DEMOLITION" | "CLASSIC";
  audioUrl: string | null;
  publishedAt: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  leagueId: string | null;
};

export type TonightMatch = { id: string; label: string; kickoff: string };

type EpisodeRow = {
  id: string;
  match_id: string;
  title: string;
  hook: string;
  script: string;
  duration_sec: number;
  badge: string | null;
  audio_url: string | null;
  published_at: string;
  matches: {
    home_score: number | null;
    away_score: number | null;
    league_id: string | null;
    home_team_id: string | null;
    away_team_id: string | null;
    leagues: { name: string } | null;
    home: { name: string } | null;
    away: { name: string } | null;
  } | null;
};

function shape(row: EpisodeRow): FeedEpisode {
  return {
    id: row.id,
    matchId: row.match_id,
    title: row.title,
    hook: row.hook,
    script: row.script,
    homeTeam: row.matches?.home?.name ?? "—",
    awayTeam: row.matches?.away?.name ?? "—",
    homeScore: row.matches?.home_score ?? 0,
    awayScore: row.matches?.away_score ?? 0,
    competition: row.matches?.leagues?.name ?? "—",
    durationSec: row.duration_sec,
    badge: (row.badge as FeedEpisode["badge"]) ?? undefined,
    audioUrl: row.audio_url,
    publishedAt: row.published_at,
    homeTeamId: row.matches?.home_team_id ?? null,
    awayTeamId: row.matches?.away_team_id ?? null,
    leagueId: row.matches?.league_id ?? null,
  };
}

export const getTodayFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();

  const [episodesRes, tonightRes, codaRes] = await Promise.all([
    sb
      .from("episodes")
      .select(
        "id, match_id, title, hook, script, duration_sec, badge, audio_url, published_at, matches!inner(home_score, away_score, league_id, home_team_id, away_team_id, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
      )
      .order("published_at", { ascending: false })
      .limit(20),
    sb
      .from("matches")
      .select("id, kickoff_at, home:home_team_id(name), away:away_team_id(name)")
      .eq("status", "scheduled")
      .gte("kickoff_at", new Date(Date.now() - 1000 * 60 * 60).toISOString())
      .lte("kickoff_at", new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString())
      .order("kickoff_at")
      .limit(6),
    sb
      .from("synthesis_insights")
      .select("text")
      .eq("status", "shipped")
      .order("drop_date", { ascending: false })
      .limit(1),
  ]);

  if (episodesRes.error) throw new Error(episodesRes.error.message);
  if (tonightRes.error) throw new Error(tonightRes.error.message);
  const coda: string | null = (codaRes.data as { text: string }[] | null)?.[0]?.text ?? null;

  const episodes = (episodesRes.data as unknown as EpisodeRow[]).map(shape);
  const tonight: TonightMatch[] = (tonightRes.data ?? []).map((m) => {
    const home = (m.home as { name?: string } | null)?.name ?? "—";
    const away = (m.away as { name?: string } | null)?.name ?? "—";
    const d = new Date(m.kickoff_at);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return { id: m.id, label: `${home} vs ${away}`, kickoff: `${hh}:${mm}` };
  });

  return { episodes, tonight, coda };
});

export const getEpisode = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("episodes")
      .select(
        "id, match_id, title, hook, script, duration_sec, badge, audio_url, published_at, matches!inner(home_score, away_score, league_id, home_team_id, away_team_id, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return shape(row as unknown as EpisodeRow);
  });

export const getTeamsAndLeagues = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [teamsRes, leaguesRes] = await Promise.all([
    sb.from("teams").select("id, name, short, league_id, color").order("name"),
    sb.from("leagues").select("id, name, country").order("name"),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (leaguesRes.error) throw new Error(leaguesRes.error.message);
  return { teams: teamsRes.data ?? [], leagues: leaguesRes.data ?? [] };
});
