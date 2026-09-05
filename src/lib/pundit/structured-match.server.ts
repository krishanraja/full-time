import { londonDate } from "@/lib/london-date";
import type { StructuredMatchInput } from "./evidence";

type MatchRow = {
  id: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  leagues: { name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
};

function nullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadStructuredMatch(matchId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: match, error: matchError }, { data: events }, { data: stats }, { data: context }] =
    await Promise.all([
      supabaseAdmin
        .from("matches")
        .select(
          "id, kickoff_at, home_score, away_score, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name)",
        )
        .eq("id", matchId)
        .single(),
      supabaseAdmin
        .from("match_events")
        .select(
          "id, type, minute, added_time, team_id, player_name, detail, source, teams:team_id(name)",
        )
        .eq("match_id", matchId)
        .order("minute"),
      supabaseAdmin.from("match_stats").select("*").eq("match_id", matchId).maybeSingle(),
      supabaseAdmin
        .from("match_context")
        .select("feeds_agree")
        .eq("match_id", matchId)
        .maybeSingle(),
    ]);
  if (matchError || !match) throw new Error(matchError?.message ?? "Match not found.");
  const row = match as unknown as MatchRow;
  const stat = stats as Record<string, number | string | null> | null;
  const input: StructuredMatchInput = {
    match: {
      id: row.id,
      homeTeam: row.home?.name ?? "Home",
      awayTeam: row.away?.name ?? "Away",
      homeScore: row.home_score ?? 0,
      awayScore: row.away_score ?? 0,
      kickoffAt: row.kickoff_at,
      competition: row.leagues?.name ?? "Competition",
      source: "database-verified",
    },
    events: (events ?? []).map((event) => ({
      id: event.id,
      type: event.type as StructuredMatchInput["events"][number]["type"],
      minute: event.minute,
      addedTime: event.added_time,
      team: (event.teams as { name?: string } | null)?.name ?? event.team_id,
      player: event.player_name,
      detail: (event as { detail?: string | null }).detail ?? null,
      source: event.source ?? "database-verified",
    })),
    stats: stat
      ? {
          homeXg: nullableNumber(stat.home_xg),
          awayXg: nullableNumber(stat.away_xg),
          homeShots: nullableNumber(stat.home_shots),
          awayShots: nullableNumber(stat.away_shots),
          homeShotsOnTarget: nullableNumber(stat.home_sot),
          awayShotsOnTarget: nullableNumber(stat.away_sot),
          homePossession: nullableNumber(stat.home_possession),
          awayPossession: nullableNumber(stat.away_possession),
          homeCorners: nullableNumber(stat.home_corners),
          awayCorners: nullableNumber(stat.away_corners),
          homeSaves: nullableNumber(stat.home_saves),
          awaySaves: nullableNumber(stat.away_saves),
          source: String(stat.source ?? "database-verified"),
        }
      : undefined,
    feedsAgree: context?.feeds_agree ?? null,
  };
  const entities = [
    row.home?.name,
    row.away?.name,
    row.leagues?.name,
    ...(events ?? []).map((event) => event.player_name),
  ].filter((value): value is string => Boolean(value));
  return {
    input,
    entities,
    coverageDate: londonDate(new Date(row.kickoff_at)),
  };
}
