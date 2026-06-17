// AI pipeline: for each finished match without an episode, generate a
// script via Lovable AI (Gemini 3 Flash), run safety filters, synthesize
// audio via ElevenLabs, upload to Storage, insert episode row. Then
// fan-out web push to subscribers.
//
// Service-role import is done INSIDE the handler — this file is reachable
// from the client bundle as a *.functions.ts module.

import { createServerFn } from "@tanstack/react-start";

const BANNED_TERMS =
  /\b(bet|odds|over\/under|injur(?:y|ed)? (?:rumour|rumor)|transfer rumou?r|allegedly|sources say|i hate|stupid|moron|idiot|f[*u]ck|sh[*i]t)\b/i;

const SYSTEM_PROMPT = `You write 60-second football match recaps (120-150 words) for the "Full Time" daily podcast.
Style rules:
- Confident, lean prose. Short sentences. One vivid image per paragraph.
- ONLY use facts provided. Do not invent goals, scorers, minutes, or quotes.
- No transfer rumours, no injury speculation, no betting language.
- No impressions of real broadcasters. No political commentary. No slurs.
- Always end with the final score stated naturally.
Output the recap text only — no titles, no preambles, no markdown.`;

type MatchRow = {
  id: string;
  home_score: number | null;
  away_score: number | null;
  importance_score: number | null;
  leagues: { name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
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

async function generateScript(m: MatchRow): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const home = m.home?.name ?? "Home";
  const away = m.away?.name ?? "Away";
  const comp = m.leagues?.name ?? "the league";
  const user = `Match: ${home} ${m.home_score}-${m.away_score} ${away} (${comp}). Write the recap.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Lovable AI ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  if (BANNED_TERMS.test(text)) throw new Error("Banned terms in generated script");
  return text;
}

async function synthesizeAudio(text: string, voiceId: string): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function titleFor(m: MatchRow): string {
  const h = m.home_score ?? 0;
  const a = m.away_score ?? 0;
  const home = m.home?.name ?? "Home";
  const away = m.away?.name ?? "Away";
  if (h > a) return `${home} edge ${away}`;
  if (a > h) return `${away} stun ${home}`;
  return `${home} and ${away} share the spoils`;
}

function hookFor(script: string): string {
  const first = script.split(/[.!?]/)[0]?.trim();
  if (first && first.length >= 12 && first.length <= 160) return first + ".";
  return script.slice(0, 140).trim() + "…";
}

export const generateEpisodeForMatch = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data?: { matchId?: string } }) => {
    // Privileged: not auth-gated because it's invoked by the cron route
    // (server-to-server) via the public cron endpoint. The endpoint itself
    // is gated via Supabase anon key as documented for /api/public/*.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data?.matchId) throw new Error("matchId required");

    const { data: match, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select(
        "id, home_score, away_score, importance_score, leagues:league_id(name), home:home_team_id(name), away:away_team_id(name)",
      )
      .eq("id", data.matchId)
      .single();
    if (matchErr || !match) throw new Error(matchErr?.message ?? "Match not found");
    const m = match as unknown as MatchRow;

    // Skip if already has an episode
    const { data: existing } = await supabaseAdmin
      .from("episodes")
      .select("id")
      .eq("match_id", m.id)
      .maybeSingle();
    if (existing) return { skipped: true, episodeId: existing.id };

    // 1. Script
    let script: string;
    try {
      script = await generateScript(m);
    } catch (err) {
      console.warn("[ai] first attempt failed, retrying once", err);
      script = await generateScript(m);
    }

    // 2. TTS — Liam voice for analyst style
    const voiceId = "TX3LPaxmHKxFdv7VOQHJ";
    const audio = await synthesizeAudio(script, voiceId);

    // 3. Upload to Storage
    const date = new Date().toISOString().slice(0, 10);
    const path = `${date}/${m.id}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("episodes")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
    const { data: pub } = supabaseAdmin.storage.from("episodes").getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    // 4. Estimate duration from ~155 wpm
    const words = script.trim().split(/\s+/).length;
    const durationSec = Math.max(45, Math.round((words / 155) * 60));

    // 5. Insert episode
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("episodes")
      .insert({
        match_id: m.id,
        title: titleFor(m),
        hook: hookFor(script),
        script,
        audio_url: audioUrl,
        duration_sec: durationSec,
        badge: badgeFor(m),
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { episodeId: inserted.id, audioUrl, badge: badgeFor(m) };
  },
);
