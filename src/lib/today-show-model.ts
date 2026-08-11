import type { PublicEdition } from "@/lib/api/editorial-public.server";
import type { Episode } from "@/data/mockEpisodes";
import { PERSONALITIES } from "@/components/PersonalitySelector";

let fixtureAudio: string | null = null;

function fixtureAudioUrl() {
  if (fixtureAudio || typeof window === "undefined") return fixtureAudio ?? "";
  const sampleRate = 8_000;
  const durationSeconds = 12;
  const samples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.min(1, index / 400, (samples - index) / 400);
    const tone = Math.sin((index / sampleRate) * Math.PI * 2 * 220);
    view.setInt16(44 + index * 2, Math.round(tone * envelope * 900), true);
  }
  fixtureAudio = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return fixtureAudio;
}

export function editionEpisode(edition: PublicEdition): Episode {
  const meta = PERSONALITIES.find((item) => item.id === edition.variant.pundit_id)!;
  return {
    id: edition.variant.id,
    title: edition.variant.title,
    hook: edition.variant.description,
    script: edition.variant.display_script,
    homeTeam: "Full Time",
    awayTeam: meta.name,
    homeScore: 0,
    awayScore: 0,
    competition: "AI Pundit show",
    durationSec: edition.variant.audio_duration_sec ?? 0,
    audioUrl:
      edition.variant.audio_url === "__fixture_audio__"
        ? fixtureAudioUrl()
        : edition.variant.audio_url,
    format: "daily",
    punditName: meta.name,
  };
}
