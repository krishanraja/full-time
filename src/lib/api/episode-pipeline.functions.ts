// AI pipeline (v2, ported from the proven _ops/generate.mjs):
// deterministic fact-pack from match_events -> Opus writer conditioned on the
// voice_corpus -> code gate -> Sonnet contradiction judge -> up to 5 regens
// (fail-closed: no episode rather than a wrong one) -> ElevenLabs TTS ->
// Storage -> episode row. Then the cron fans out web push.
//
// Service-role import is done INSIDE the handler — this file is reachable
// from the client bundle as a *.functions.ts module.

import { createServerFn } from "@tanstack/react-start";
import type {
  MatchInfo,
  EventRow,
  StatRow,
  CorpusRow,
} from "@/lib/api/recap-generator.server";

type MatchRow = {
  id: string;
  home_score: number | null;
  away_score: number | null;
  importance_score: number | null;
  home_team_id: string | null;
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

async function synthesizeAudio(text: string): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "onwK4e9ZLuTAKqWW03F9"; // Daniel
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 140)}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Plain function so server routes (cron, admin trigger) can call it directly.
// A createServerFn cannot be invoked server-to-server (that hits the RPC path).
export async function runEpisodePipeline(matchId: string) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateRecap } = await import("@/lib/api/recap-generator.server");

    if (!matchId) throw new Error("matchId required");

    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select(
        "id, home_score, away_score, importance_score, home_team_id, league_id, leagues:league_id(name), home:home_team_id(name, short), away:away_team_id(name, short)",
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

    // Deterministic inputs.
    const [{ data: events }, { data: stats }, { data: corpusRows }] = await Promise.all([
      supabaseAdmin
        .from("match_events")
        .select("minute, added_time, type, team_id, player_name")
        .eq("match_id", m.id)
        .order("minute", { ascending: true, nullsFirst: false }),
      supabaseAdmin.from("match_stats").select("*").eq("match_id", m.id).maybeSingle(),
      supabaseAdmin
        .from("voice_corpus")
        .select("kind, content")
        .eq("active", true)
        .in("kind", ["style_rule", "do", "dont", "example"]),
    ]);

    const info: MatchInfo = {
      homeId: m.home_team_id ?? "",
      homeName: m.home?.name ?? "Home",
      homeShort: m.home?.short ?? "HOM",
      awayName: m.away?.name ?? "Away",
      awayShort: m.away?.short ?? "AWY",
      leagueName: m.leagues?.name ?? "the league",
      homeScore: m.home_score ?? 0,
      awayScore: m.away_score ?? 0,
    };

    const recap = await generateRecap(
      info,
      (events ?? []) as EventRow[],
      (stats ?? null) as StatRow,
      (corpusRows ?? []) as CorpusRow[],
    );
    // Fail closed: never publish a recap that did not pass the gate + judge.
    if (!recap.ok) {
      throw new Error(`recap failed gate/judge after ${recap.attempts} attempts`);
    }

    const script = recap.script.trim();
    const audio = await synthesizeAudio(script);

    const date = new Date().toISOString().slice(0, 10);
    const path = `${date}/${m.id}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("episodes")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
    const { data: pub } = supabaseAdmin.storage.from("episodes").getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    const words = script.split(/\s+/).length;
    const durationSec = Math.max(45, Math.round((words / 155) * 60));

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("episodes")
      .insert({
        match_id: m.id,
        title: recap.title || titleFallback(m),
        hook: hookFrom(recap.magic_sentence, script),
        script,
        magic_sentence: recap.magic_sentence || null,
        segments: [{ seg: "recap", text: script }],
        audio_url: audioUrl,
        duration_sec: durationSec,
        badge: badgeFor(m),
        model: "opus-4-8+gate+judge+eleven_multilingual_v2",
        status: "published",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    return {
      episodeId: inserted.id,
      audioUrl,
      badge: badgeFor(m),
      attempts: recap.attempts,
    };
}

export const generateEpisodeForMatch = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data?: { matchId?: string } }) => {
    if (!data?.matchId) throw new Error("matchId required");
    return runEpisodePipeline(data.matchId);
  },
);
