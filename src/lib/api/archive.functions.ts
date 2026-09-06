// Archive + name-a-game (docs/15-access-and-waitlist-plan.md Phase 2).
// The archive is every finished match we hold data for: matches with an
// episode play instantly; matches with event data can be narrated on demand
// through the fail-closed engine, rate-limited per user per UTC day.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { FeedEpisode } from "@/lib/api/feed.functions";
import {
  dailyGenerationLimit,
  isProProfile,
  FREE_DAILY_GENERATION_LIMIT,
  PRO_DAILY_GENERATION_LIMIT,
} from "@/lib/entitlement";

// Kept as an alias so existing imports (and the signed-out archive copy, which
// can only ever be quoting the free allowance) keep working.
export const DAILY_GENERATION_LIMIT = FREE_DAILY_GENERATION_LIMIT;

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type ArchiveMatch = {
  matchId: string;
  kickoffAt: string;
  competition: string;
  leagueId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  // exactly one of these shapes the row's affordance:
  episode: FeedEpisode | null; // exists -> play
  generatable: boolean; // no episode but events exist -> "Narrate this one"
};

export type ArchiveData = {
  matches: ArchiveMatch[];
  remainingToday: number;
  /** The caller's own daily allowance, so the UI never quotes the free number
   *  at a Pro subscriber ("20 of 3 left" was the bug waiting to happen). */
  dailyLimit: number;
  /** Whether on-demand narration is actually available.
   *
   *  It used to be inferred from prelaunch mode, which meant turning prelaunch
   *  off to publish the first show silently opened a button that spends real
   *  model and narration money on the superseded episode pipeline. The server
   *  decides and says so, rather than the client guessing from a flag that
   *  means something else. */
  generationEnabled: boolean;
};

/** The legacy episode pipeline is not the six-pundit system and is off by
 *  default. Prelaunch mode is about publishing, not about this. */
export function legacyGenerationEnabled(): boolean {
  return process.env.ENABLE_LEGACY_DAILY_DROP === "true";
}

type ArchiveRow = {
  id: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  league_id: string | null;
  leagues: { name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
  episodes: {
    id: string;
    title: string;
    hook: string;
    script: string;
    duration_sec: number;
    badge: string | null;
    audio_url: string | null;
    og_image_url: string | null;
    published_at: string;
  }[];
  match_events: { count: number }[];
};

function shapeArchive(row: ArchiveRow): ArchiveMatch {
  const ep = row.episodes?.[0] ?? null;
  const eventCount = row.match_events?.[0]?.count ?? 0;
  return {
    matchId: row.id,
    kickoffAt: row.kickoff_at,
    competition: row.leagues?.name ?? "Unknown competition",
    leagueId: row.league_id,
    homeTeam: row.home?.name ?? "Unknown home team",
    awayTeam: row.away?.name ?? "Unknown away team",
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    episode: ep
      ? {
          id: ep.id,
          matchId: row.id,
          title: ep.title,
          hook: ep.hook,
          script: ep.script,
          homeTeam: row.home?.name ?? "Unknown home team",
          awayTeam: row.away?.name ?? "Unknown away team",
          homeScore: row.home_score ?? 0,
          awayScore: row.away_score ?? 0,
          competition: row.leagues?.name ?? "Unknown competition",
          durationSec: ep.duration_sec,
          badge: (ep.badge as FeedEpisode["badge"]) ?? undefined,
          audioUrl: ep.audio_url,
          ogImageUrl: ep.og_image_url,
          publishedAt: ep.published_at,
          homeTeamId: null,
          awayTeamId: null,
          leagueId: row.league_id,
        }
      : null,
    generatable: !ep && eventCount > 0,
  };
}

const ARCHIVE_SELECT =
  "id, kickoff_at, home_score, away_score, league_id, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name), episodes(id, title, hook, script, duration_sec, badge, audio_url, og_image_url, published_at), match_events(count)";

// Honest teaser numbers for the signed-out state. Public on purpose:
// it reveals only counts.
export const getArchiveOverview = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [matchesRes, episodesRes] = await Promise.all([
    sb.from("matches").select("id", { count: "exact", head: true }).eq("status", "finished"),
    sb.from("episodes").select("id", { count: "exact", head: true }),
  ]);
  return {
    finishedMatches: matchesRes.count ?? 0,
    narrated: episodesRes.count ?? 0,
  };
});

/** The caller's allowance for today. Pro buys a bigger one, so the limit has
 *  to be resolved from the profile rather than being a module constant. */
async function limitFor(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("plan, subscription_status, current_period_end")
    .eq("id", userId)
    .maybeSingle();
  return dailyGenerationLimit(isProProfile(prof));
}

async function remainingFor(userId: string, limit?: number): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const dayStart = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
  const { count } = await supabaseAdmin
    .from("generation_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "failed") // a failed attempt costs nothing
    .gte("created_at", dayStart);
  return Math.max(0, (limit ?? (await limitFor(userId))) - (count ?? 0));
}

export const getArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArchiveData> => {
    const sb = publicClient();
    const { data, error } = await sb
      .from("matches")
      .select(ARCHIVE_SELECT)
      .eq("status", "finished")
      .order("kickoff_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const dailyLimit = await limitFor(context.userId);
    return {
      matches: (data as unknown as ArchiveRow[]).map(shapeArchive),
      remainingToday: await remainingFor(context.userId, dailyLimit),
      dailyLimit,
      generationEnabled: legacyGenerationEnabled(),
    };
  });

// Narrate a named game on demand. Signed-in only, DAILY_GENERATION_LIMIT per
// UTC day. Fail-closed like everything else: if the engine cannot prove the
// recap right, the user gets an honest error and the attempt is not charged.
export const requestEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ matchId: z.string().min(1) }))
  .handler(async ({ data, context }): Promise<{ episode: FeedEpisode; remainingToday: number }> => {
    // Prelaunch mode is about whether shows publish. It was standing in for
    // this too, so turning it off to publish the first show quietly opened a
    // button that spends model and narration money on the superseded episode
    // pipeline. This gate is its own flag, and it is off unless someone says
    // otherwise.
    if (!legacyGenerationEnabled()) {
      throw new Error(
        "On-demand narration is off. Full Time publishes the daily six-pundit show instead.",
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runEpisodePipeline } = await import("@/lib/api/episode-pipeline.functions");

    const sb = publicClient();
    const fetchShaped = async () => {
      const { data: row, error } = await sb
        .from("matches")
        .select(ARCHIVE_SELECT)
        .eq("id", data.matchId)
        .single();
      if (error) throw new Error(error.message);
      return shapeArchive(row as unknown as ArchiveRow);
    };

    const existing = await fetchShaped();
    if (existing.episode) {
      return { episode: existing.episode, remainingToday: await remainingFor(context.userId) };
    }
    if (!existing.generatable) {
      throw new Error("We do not hold the minute-by-minute data for this one yet.");
    }

    const limit = await limitFor(context.userId);
    const remaining = await remainingFor(context.userId, limit);
    if (remaining <= 0) {
      throw new Error(
        limit >= PRO_DAILY_GENERATION_LIMIT
          ? `That is ${limit} narrations today. The counter resets at midnight UTC.`
          : `That is ${limit} narrations today. The counter resets at midnight UTC, or Full Time Pro raises it to ${PRO_DAILY_GENERATION_LIMIT}.`,
      );
    }

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("generation_requests")
      .insert({ user_id: context.userId, match_id: data.matchId, status: "running" })
      .select("id")
      .single();
    if (reqErr) throw new Error(reqErr.message);

    try {
      const result = await runEpisodePipeline(data.matchId);
      await supabaseAdmin
        .from("generation_requests")
        .update({ status: "done", episode_id: result.episodeId ?? null })
        .eq("id", req.id);
    } catch (e) {
      await supabaseAdmin
        .from("generation_requests")
        .update({
          status: "failed",
          error: e instanceof Error ? e.message.slice(0, 300) : "unknown",
        })
        .eq("id", req.id);
      throw new Error(
        "We could not verify this recap against the match facts, so we did not publish it. Nothing was counted against your day.",
      );
    }

    const after = await fetchShaped();
    if (!after.episode)
      throw new Error("Generation finished but the episode did not land. Try again.");
    return { episode: after.episode, remainingToday: await remainingFor(context.userId) };
  });
