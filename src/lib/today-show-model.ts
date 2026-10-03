import type {
  PublicEdition,
  PublicFixture,
  PublicProofCard,
  PublicToday,
} from "@/lib/api/editorial-public.server";
import type { Episode } from "@/data/mockEpisodes";
import { PERSONALITIES } from "@/components/PersonalitySelector";
import { clubDisplayName } from "@/lib/premier-league";

/** One AI Pundit's show about one match: what Today plays and names. */
export type TodayShow = PublicEdition & {
  fixture: PublicFixture | null;
  proofCards: PublicProofCard[];
};

/** The show a Today or variant response carries: today's edition for the
 *  requested pundit, else the latest one the server chose. */
export function showFrom(
  response: Pick<PublicToday, "coverageDate" | "variant" | "latest" | "fixture" | "proofCards">,
): TodayShow | null {
  const edition = response.variant
    ? { coverageDate: response.coverageDate, variant: response.variant }
    : response.latest;
  if (!edition) return null;
  return { ...edition, fixture: response.fixture, proofCards: response.proofCards };
}

/** "Man City 5-3 Sunderland", or null when there is no fixture to name. */
export function matchLabel(fixture: PublicFixture | null | undefined): string | null {
  if (!fixture) return null;
  const home = clubDisplayName(fixture.homeTeam);
  const away = clubDisplayName(fixture.awayTeam);
  return fixture.homeScore != null && fixture.awayScore != null
    ? `${home} ${fixture.homeScore}-${fixture.awayScore} ${away}`
    : `${home} v ${away}`;
}

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

export function editionEpisode(
  edition: PublicEdition,
  fixture: PublicFixture | null = null,
): Episode {
  const meta = PERSONALITIES.find((item) => item.id === edition.variant.pundit_id)!;
  // The match, not a placeholder. This used to read "Full Time 0-0 The
  // Reporter" on the lock screen, the mini player and the completion toast.
  return {
    id: edition.variant.id,
    title: edition.variant.title,
    hook: edition.variant.description,
    script: edition.variant.display_script,
    homeTeam: fixture ? clubDisplayName(fixture.homeTeam) : "",
    awayTeam: fixture ? clubDisplayName(fixture.awayTeam) : "",
    homeScore: fixture?.homeScore ?? 0,
    awayScore: fixture?.awayScore ?? 0,
    competition: fixture?.competition ?? "Premier League",
    matchLabel: matchLabel(fixture) ?? undefined,
    punditId: edition.variant.pundit_id,
    coverSeed: edition.variant.drop_id,
    durationSec: edition.variant.audio_duration_sec ?? 0,
    audioUrl:
      edition.variant.audio_url === "__fixture_audio__"
        ? fixtureAudioUrl()
        : edition.variant.audio_url,
    format: "daily",
    punditName: meta.name,
  };
}
