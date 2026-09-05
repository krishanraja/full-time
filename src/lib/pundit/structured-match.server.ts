import { londonDate } from "@/lib/london-date";
import type { PriorMatch, PriorMeeting, StructuredMatchInput } from "./evidence";

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

type PriorRow = {
  kickoff_at: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string } | null;
  away: { name: string } | null;
};

/** The last few results a side arrived carrying.
 *
 *  Read from matches we have already ingested and verified, never from a live
 *  call, so the pack stays closed-world and reproducible. A side with two
 *  matches behind it gets two; the pundit is told how many it is looking at. */
function priorMatches(rows: PriorRow[], teamId: string): PriorMatch[] {
  return rows.map((row) => {
    const atHome = row.home_team_id === teamId;
    return {
      date: row.kickoff_at,
      opponent: (atHome ? row.away?.name : row.home?.name) ?? "their opponent",
      venue: atHome ? ("home" as const) : ("away" as const),
      goalsFor: (atHome ? row.home_score : row.away_score) ?? 0,
      goalsAgainst: (atHome ? row.away_score : row.home_score) ?? 0,
    };
  });
}

const FORM_MATCHES = 5;

export async function loadStructuredMatch(matchId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: match, error: matchError }, { data: events }, { data: stats }, { data: context }] =
    await Promise.all([
      supabaseAdmin
        .from("matches")
        .select(
          "id, kickoff_at, home_team_id, away_team_id, home_score, away_score, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name)",
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

  // Form and head-to-head, both already in the database and until now read by
  // nobody. Fetched after the match itself because both queries need its
  // kickoff time and its two teams.
  const rowWithTeams = match as unknown as MatchRow & {
    home_team_id: string;
    away_team_id: string;
  };
  const teamIds = [rowWithTeams.home_team_id, rowWithTeams.away_team_id].filter(Boolean);
  const [{ data: priorRows }, { data: h2hRows }] = await Promise.all([
    teamIds.length
      ? supabaseAdmin
          .from("matches")
          .select(
            "kickoff_at, home_team_id, away_team_id, home_score, away_score, home:home_team_id(name), away:away_team_id(name)",
          )
          .eq("status", "finished")
          .lt("kickoff_at", row.kickoff_at)
          .or(teamIds.map((id) => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(","))
          .order("kickoff_at", { ascending: false })
          .limit(FORM_MATCHES * 4)
      : Promise.resolve({ data: [] }),
    teamIds.length === 2
      ? supabaseAdmin
          .from("h2h_cache")
          .select("meetings")
          // The pairing is stored in whichever order the ingest saw it, and a
          // row cannot have the same team on both sides, so asking for both
          // columns to be one of these two teams matches it either way round.
          // A nested and-inside-or would do the same and would return nothing
          // at all if a bracket were wrong, which is the shape of failure that
          // has already cost this project five days of expected goals.
          .in("team_a_id", teamIds)
          .in("team_b_id", teamIds)
          .limit(1)
      : Promise.resolve({ data: [] }),
  ]);
  const prior = (priorRows ?? []) as unknown as PriorRow[];
  const teamName = new Map([
    [rowWithTeams.home_team_id, row.home?.name],
    [rowWithTeams.away_team_id, row.away?.name],
  ]);
  const meetings = (
    ((h2hRows ?? [])[0]?.meetings ?? []) as Array<{
      date?: string;
      home_id?: string;
      away_id?: string;
      home_goals?: number;
      away_goals?: number;
    }>
  )
    .filter((meeting) => meeting.date && meeting.home_id && meeting.away_id)
    .map(
      (meeting): PriorMeeting => ({
        date: meeting.date!,
        homeTeam: teamName.get(meeting.home_id!) ?? meeting.home_id!,
        awayTeam: teamName.get(meeting.away_id!) ?? meeting.away_id!,
        homeGoals: meeting.home_goals ?? 0,
        awayGoals: meeting.away_goals ?? 0,
      }),
    )
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, FORM_MATCHES);
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
          homeShotsInsideBox: nullableNumber(stat.home_shots_inside_box),
          awayShotsInsideBox: nullableNumber(stat.away_shots_inside_box),
          homeShotsOutsideBox: nullableNumber(stat.home_shots_outside_box),
          awayShotsOutsideBox: nullableNumber(stat.away_shots_outside_box),
          homePossession: nullableNumber(stat.home_possession),
          awayPossession: nullableNumber(stat.away_possession),
          homeCorners: nullableNumber(stat.home_corners),
          awayCorners: nullableNumber(stat.away_corners),
          homeSaves: nullableNumber(stat.home_saves),
          awaySaves: nullableNumber(stat.away_saves),
          source: String(stat.source ?? "database-verified"),
        }
      : undefined,
    form: {
      home: priorMatches(
        prior.filter(
          (item) =>
            item.home_team_id === rowWithTeams.home_team_id ||
            item.away_team_id === rowWithTeams.home_team_id,
        ),
        rowWithTeams.home_team_id,
      ).slice(0, FORM_MATCHES),
      away: priorMatches(
        prior.filter(
          (item) =>
            item.home_team_id === rowWithTeams.away_team_id ||
            item.away_team_id === rowWithTeams.away_team_id,
        ),
        rowWithTeams.away_team_id,
      ).slice(0, FORM_MATCHES),
    },
    headToHead: meetings,
    feedsAgree: context?.feeds_agree ?? null,
  };
  const entities = [
    row.home?.name,
    row.away?.name,
    row.leagues?.name,
    ...(events ?? []).map((event) => event.player_name),
    // Opponents from the form and head-to-head facts. A name the pack licences
    // is a name the script may speak, and every spoken name is measured for
    // pronunciation, so the two lists have to agree.
    ...(input.form?.home ?? []).map((prior) => prior.opponent),
    ...(input.form?.away ?? []).map((prior) => prior.opponent),
    ...meetings.flatMap((meeting) => [meeting.homeTeam, meeting.awayTeam]),
  ].filter((value): value is string => Boolean(value));
  return {
    input,
    entities,
    coverageDate: londonDate(new Date(row.kickoff_at)),
  };
}
