// AI pipeline: deterministic fact pack from match_events + pre-computed
// enrichment clauses -> Opus writer conditioned on the voice_corpus -> the
// licence gate -> claim-scoped Sonnet judge -> up to 5 regens (fail-closed: no
// episode rather than a wrong one) -> eleven_v3 narration with code-placed
// delivery tags -> Scribe fidelity gate -> Storage -> episode row. The cron
// then fans out web push.
//
// RULE 3: enrichment is materialised at INGEST time, never fetched here. This
// function reads only from Postgres. No API-Football call ever happens inside
// the generation window.
//
// Service-role import is done INSIDE the handler: this file is reachable from
// the client bundle as a *.functions.ts module.

import type { MatchInfo, EventRow, StatRow, CorpusRow } from "@/lib/api/recap-generator.server";
import type { AngleMatch, H2HMeeting, MatchContext, RecentAngle } from "@/lib/api/angles.server";

type MatchRow = {
  id: string;
  home_score: number | null;
  away_score: number | null;
  importance_score: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  league_id: string | null;
  leagues: { name: string } | null;
  home: { name: string; short: string } | null;
  away: { name: string; short: string } | null;
};

function badgeFor(m: MatchRow): string | null {
  const h = m.home_score ?? 0;
  const a = m.away_score ?? 0;
  const total = h + a;
  const diff = Math.abs(h - a);
  if (diff >= 4) return "DEMOLITION";
  if (total >= 5) return "LATE DRAMA";
  if (h === a && total >= 2) return "CLASSIC";
  if ((m.importance_score ?? 0) >= 8.5) return "BIGGEST MOMENT";
  return null;
}

/** Maps the match shape to a `voice_corpus.per_match_type` label. The three
 *  table-dependent labels (title clincher, relegation six-pointer, shock
 *  result) are deliberately NOT selectable before T15 ships standings: their
 *  guidance invites exactly the season-consequence language the gate forbids,
 *  so choosing one would guarantee wasted attempts. */
function matchTypeFor(m: MatchRow, hasRed: boolean): string | null {
  const h = m.home_score ?? 0;
  const a = m.away_score ?? 0;
  const total = h + a;
  const diff = Math.abs(h - a);
  if (total === 0) return "0-0 draw";
  if (hasRed) return "Controversy (VAR, red card, refereeing)";
  if (diff >= 3) return "Dominant win (e.g. 4-0)";
  if (total >= 5) return "High-scoring thriller";
  if (diff === 1 && total <= 2) return "Scrappy / narrow win (1-0, ugly)";
  return null;
}

function titleFallback(m: MatchRow): string {
  const h = m.home_score ?? 0;
  const a = m.away_score ?? 0;
  const home = m.home?.name ?? "Home";
  const away = m.away?.name ?? "Away";
  if (h > a) return `${home} edge ${away}`;
  if (a > h) return `${away} stun ${home}`;
  return `${home} and ${away} share the spoils`;
}

function hookFrom(magic: string, script: string): string {
  if (magic && magic.length >= 12 && magic.length <= 160) return magic;
  const first = script.split(/[.!?]/)[0]?.trim();
  if (first && first.length >= 12 && first.length <= 160) return first + ".";
  return script.slice(0, 140).trim() + "…";
}

// Plain function so server routes (cron, admin trigger) can call it directly.
// A createServerFn cannot be invoked server-to-server (that hits the RPC path).
export async function runEpisodePipeline(matchId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { generateRecap } = await import("@/lib/api/recap-generator.server");
  const { buildAngles, buildContextStrings } = await import("@/lib/api/angles.server");
  const { narrate } = await import("@/lib/api/narration.server");

  if (!matchId) throw new Error("matchId required");

  const { data: match, error: matchErr } = await supabaseAdmin
    .from("matches")
    .select(
      "id, home_score, away_score, importance_score, home_team_id, away_team_id, league_id, leagues:league_id(name), home:home_team_id(name, short), away:away_team_id(name, short)",
    )
    .eq("id", matchId)
    .single();
  if (matchErr || !match) throw new Error(matchErr?.message ?? "Match not found");
  const m = match as unknown as MatchRow;

  // Idempotent: skip if this match already has an episode.
  const { data: existing } = await supabaseAdmin
    .from("episodes")
    .select("id")
    .eq("match_id", m.id)
    .maybeSingle();
  if (existing) return { skipped: true, episodeId: existing.id };

  // Deterministic inputs. Every one of these is a plain Postgres read.
  const [{ data: events }, { data: stats }, { data: corpusRows }, { data: ctxRow }] =
    await Promise.all([
      supabaseAdmin
        .from("match_events")
        .select(
          "minute, added_time, type, team_id, player_id, player_name, assist_player_id, detail",
        )
        .eq("match_id", m.id)
        .order("minute", { ascending: true, nullsFirst: false }),
      supabaseAdmin.from("match_stats").select("*").eq("match_id", m.id).maybeSingle(),
      supabaseAdmin
        .from("voice_corpus")
        .select("kind, content, match_type, weight")
        .eq("active", true)
        .in("kind", ["style_rule", "do", "dont", "example", "per_match_type"]),
      supabaseAdmin.from("match_context").select("*").eq("match_id", m.id).maybeSingle(),
    ]);

  const ctx = (ctxRow ?? null) as MatchContext;

  // T3: the two feeds disagreed on the scoreline. Everything downstream is
  // built on that number, so generating would be building on sand.
  if (ctx && ctx.feeds_agree === false) {
    throw new Error("score cross-check failed: api-football and football-data.org disagree");
  }

  const info: MatchInfo = {
    homeId: m.home_team_id ?? "",
    awayId: m.away_team_id ?? "",
    homeName: m.home?.name ?? "Home",
    homeShort: m.home?.short ?? "HOM",
    awayName: m.away?.name ?? "Away",
    awayShort: m.away?.short ?? "AWY",
    leagueName: m.leagues?.name ?? "the league",
    homeScore: m.home_score ?? 0,
    awayScore: m.away_score ?? 0,
  };

  const evs = (events ?? []) as EventRow[];

  // ---- enrichment. RULE 2: every step here is optional and never fatal.
  let meetings: H2HMeeting[] = [];
  let recent: RecentAngle[] = [];
  try {
    const [aId, bId] = [info.homeId, info.awayId].sort();
    const { data: h2h } = await supabaseAdmin
      .from("h2h_cache")
      .select("meetings")
      .eq("league_id", m.league_id ?? "")
      .eq("team_a_id", aId)
      .eq("team_b_id", bId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    meetings = ((h2h?.meetings ?? []) as H2HMeeting[]) ?? [];
  } catch (e) {
    console.warn("[pipeline] h2h lookup failed, continuing without it:", e);
  }
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
    const { data: prior } = await supabaseAdmin
      .from("episodes")
      .select("angle_id, published_at")
      .not("angle_id", "is", null)
      .gte("published_at", since);
    recent = (prior ?? []).map((p: { angle_id: string; published_at: string }) => ({
      angle_id: p.angle_id,
      days_ago: Math.floor((Date.now() - new Date(p.published_at).getTime()) / 86_400_000),
    }));
  } catch (e) {
    console.warn("[pipeline] recent-angle lookup failed, continuing without variety penalty:", e);
  }

  const angleMatch: AngleMatch = {
    homeId: info.homeId,
    awayId: info.awayId,
    homeName: info.homeName,
    awayName: info.awayName,
    leagueName: info.leagueName,
    homeScore: info.homeScore,
    awayScore: info.awayScore,
  };
  const angles = buildAngles(angleMatch, evs, (stats ?? null) as never, ctx, meetings, recent);
  const contextStrings = buildContextStrings(angleMatch, ctx);
  const hasRed = evs.some((e) => e.type === "red" || e.type === "second_yellow");

  const recap = await generateRecap(
    info,
    evs,
    (stats ?? null) as StatRow,
    (corpusRows ?? []) as CorpusRow[],
    { angles, context: contextStrings, matchType: matchTypeFor(m, hasRed) },
  );
  // Fail closed: never publish a recap that did not pass the gate + judge.
  if (!recap.ok) {
    throw new Error(`recap failed gate/judge after ${recap.attempts} attempts`);
  }

  const script = recap.script.trim();

  // ---- narration. The entity list doubles as the fidelity-gate wildcard set:
  // Scribe reliably mangles proper nouns, so they must not count as errors.
  const entities = [
    info.homeName,
    info.awayName,
    info.leagueName,
    ...evs.map((e) => e.player_name).filter(Boolean),
    ctx?.home_gk_name,
    ctx?.away_gk_name,
  ].filter(Boolean) as string[];

  const narration = await narrate(script, recap.magic_sentence, m.id, entities);

  const date = new Date().toISOString().slice(0, 10);
  const path = `${date}/${m.id}.mp3`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("episodes")
    .upload(path, narration.audio, { contentType: "audio/mpeg", upsert: true });
  if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
  const { data: pub } = supabaseAdmin.storage.from("episodes").getPublicUrl(path);
  const audioUrl = pub.publicUrl;

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("episodes")
    .insert({
      match_id: m.id,
      title: recap.title || titleFallback(m),
      hook: hookFrom(recap.magic_sentence, script),
      script,
      spoken_script: narration.spokenScript,
      magic_sentence: recap.magic_sentence || null,
      segments: [{ seg: "recap", text: script }],
      audio_url: audioUrl,
      audio_bytes: narration.audio.byteLength,
      duration_sec: narration.durationSec,
      badge: badgeFor(m),
      angle_id: recap.used_angle === "none" ? null : recap.used_angle,
      tts_model: narration.ttsModel,
      tts_voice_id: narration.ttsVoiceId,
      tts_seed: narration.ttsSeed,
      model: `opus-4-8+gate+judge+${narration.ttsModel}`,
      status: "published",
      // `verification` exists in the schema and was NULL on every live row.
      // It is the audit trail for the accuracy guarantee: what was offered,
      // what was used, what relaxed, and what the audio was proven to say.
      verification: {
        score_ok: recap.checks.score ?? null,
        goals_consistent: recap.checks.goalsConsistent ?? null,
        feeds_agree: ctx?.feeds_agree ?? null,
        angle_offered: recap.offered_angles,
        angle_used: recap.used_angle,
        licensed_numbers_ok: recap.checks.numeric_licence ?? null,
        name_license_mode: recap.name_license_mode,
        quality_relaxed: recap.quality_relaxed,
        attempts: recap.attempts,
        tts_model: narration.ttsModel,
        fidelity_wer: narration.fidelity.wer,
        fidelity_numbers: narration.fidelity.numbers,
        checks: recap.checks,
      },
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  return {
    episodeId: inserted.id,
    audioUrl,
    badge: badgeFor(m),
    attempts: recap.attempts,
    angle: recap.used_angle,
    ttsModel: narration.ttsModel,
  };
}

// NOTE: there is deliberately NO unauthenticated createServerFn wrapper around
// runEpisodePipeline. Generation spends Anthropic + ElevenLabs money; the only
// entry points are the CRON_SECRET-guarded cron and the authed, rate-limited
// requestEpisode in archive.functions.ts.
