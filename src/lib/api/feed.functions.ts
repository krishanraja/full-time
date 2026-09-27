import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  currentCoverageDate,
  londonDate,
  londonDayBounds,
  londonTimeLabel,
} from "@/lib/london-date";
import {
  PREMIER_LEAGUE_ID,
  clubDisplayName,
  crestUrl,
  currentSeasonClubs,
} from "@/lib/premier-league";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
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
  ogImageUrl: string | null;
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
  og_image_url: string | null;
  published_at: string;
  matches: {
    home_score: number | null;
    away_score: number | null;
    kickoff_at: string;
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
    homeTeam: row.matches?.home?.name ?? "Unknown home team",
    awayTeam: row.matches?.away?.name ?? "Unknown away team",
    homeScore: row.matches?.home_score ?? 0,
    awayScore: row.matches?.away_score ?? 0,
    competition: row.matches?.leagues?.name ?? "Unknown competition",
    durationSec: row.duration_sec,
    badge: (row.badge as FeedEpisode["badge"]) ?? undefined,
    audioUrl: row.audio_url,
    ogImageUrl: row.og_image_url,
    publishedAt: row.published_at,
    homeTeamId: row.matches?.home_team_id ?? null,
    awayTeamId: row.matches?.away_team_id ?? null,
    leagueId: row.matches?.league_id ?? null,
  };
}

export const getTodayFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const coverageDate = currentCoverageDate();
  const coverage = londonDayBounds(coverageDate);
  const upcoming = londonDayBounds(londonDate());

  const [episodesRes, tonightRes, codaRes, coverageRes] = await Promise.all([
    sb
      .from("episodes")
      .select(
        "id, match_id, title, hook, script, duration_sec, badge, audio_url, og_image_url, published_at, matches!inner(home_score, away_score, kickoff_at, league_id, home_team_id, away_team_id, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
      )
      .gte("matches.kickoff_at", coverage.start.toISOString())
      .lt("matches.kickoff_at", coverage.end.toISOString())
      .order("published_at", { ascending: false })
      .limit(20),
    sb
      .from("matches")
      .select("id, kickoff_at, home:home_team_id(name), away:away_team_id(name)")
      .eq("status", "scheduled")
      .gte("kickoff_at", upcoming.start.toISOString())
      .lt("kickoff_at", upcoming.end.toISOString())
      .order("kickoff_at")
      .limit(6),
    sb
      .from("synthesis_insights")
      .select("text")
      .eq("status", "shipped")
      .eq("drop_date", coverageDate)
      .limit(1),
    sb
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("kickoff_at", coverage.start.toISOString())
      .lt("kickoff_at", coverage.end.toISOString()),
  ]);

  if (episodesRes.error) throw new Error(episodesRes.error.message);
  if (tonightRes.error) throw new Error(tonightRes.error.message);
  const coda: string | null = (codaRes.data as { text: string }[] | null)?.[0]?.text ?? null;

  const episodes = (episodesRes.data as unknown as EpisodeRow[]).map(shape);
  // Legacy episode rows predate the world-class harness. They remain available
  // as archive/demo material, but cannot appear as a current drop in pre-launch.
  const currentEpisodes = process.env.PRELAUNCH_MODE === "false" ? episodes : [];
  const tonight: TonightMatch[] = (tonightRes.data ?? []).map((m) => {
    const home = (m.home as { name?: string } | null)?.name ?? "Unknown home team";
    const away = (m.away as { name?: string } | null)?.name ?? "Unknown away team";
    return { id: m.id, label: `${home} vs ${away}`, kickoff: londonTimeLabel(m.kickoff_at) };
  });

  const state =
    currentEpisodes.length > 0 ? "published" : (coverageRes.count ?? 0) > 0 ? "pending" : "off_day";
  return { episodes: currentEpisodes, tonight, coda, coverageDate, state };
});

export const getEpisode = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("episodes")
      .select(
        "id, match_id, title, hook, script, duration_sec, badge, audio_url, og_image_url, published_at, matches!inner(home_score, away_score, league_id, home_team_id, away_team_id, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name))",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return shape(row as unknown as EpisodeRow);
  });

/** The twenty clubs of the current Premier League season, for Teams.
 *
 *  It used to return every stored team and league: 120 clubs from five
 *  leagues, from 1. FC Heidenheim to Wolves, on a product that covers one.
 *  The current season is the latest one any Premier League match is stored
 *  under, and the clubs are the ones that play in it, which drops relegated
 *  clubs still carrying the league id (`currentSeasonClubs`). */
export const getPremierLeagueClubs = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const latest = await sb
    .from("matches")
    .select("season")
    .eq("league_id", PREMIER_LEAGUE_ID)
    .not("season", "is", null)
    .order("season", { ascending: false })
    .limit(1);
  if (latest.error) throw new Error(latest.error.message);
  const season = latest.data?.[0]?.season;
  if (season == null) return { season: null, clubs: [] };
  const [teamsRes, matchesRes] = await Promise.all([
    sb.from("teams").select("id, name, crest_url").eq("league_id", PREMIER_LEAGUE_ID),
    sb
      .from("matches")
      .select("home_team_id, away_team_id")
      .eq("league_id", PREMIER_LEAGUE_ID)
      .eq("season", season)
      .limit(1000),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);
  const clubs = currentSeasonClubs(teamsRes.data ?? [], matchesRes.data ?? []).map((team) => ({
    id: team.id,
    name: clubDisplayName(team.name),
    crestUrl: crestUrl(team.crest_url),
  }));
  return { season, clubs };
});
