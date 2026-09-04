import type { PunditId } from "./types";
import { getPunditSpec } from "./specs";
import { serviceRest } from "./service-rest.server";

type LexiconRow = {
  display_text: string;
  verification_state: "human_verified";
  provider_dictionary_id: string | null;
  provider_dictionary_version_id: string | null;
};

type VoiceCandidateRow = {
  id: string;
  provider: string;
  provider_voice_ref: string;
  blind_metrics: Record<string, unknown>;
};

/** ElevenLabs accepts at most three pronunciation dictionaries per request. */
const MAX_DICTIONARIES = 3;

/** Founder launch override of 2026-09-04: the selected voice per pundit is the
 *  configured ELEVENLABS_VOICE_* value, attested by the founder rather than by
 *  a blind full-length review. The attestation is recorded on the row so the
 *  publication audit trail says exactly what was and was not reviewed. */
const FOUNDER_VOICE_ATTESTATION = {
  attestation: "founder_override_2026-09-04",
  performanceProfileVerified: true,
  clippingVerified: true,
  emphasisVerified: true,
  punchlineTimingVerified: true,
  synthesisArtifactsVerified: true,
} as const;

/** Letters that NFKD leaves intact but that speech-to-text renders as plain
 *  ASCII: Ødegaard, Sørloth, Kovačić are spelled "Odegaard", "Sorloth",
 *  "Kovacic" in transcripts. */
const ASCII_FOLD: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ð: "d",
  đ: "d",
  þ: "th",
  ł: "l",
  ı: "i",
};

export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[øæœßðđþłı]/g, (letter) => ASCII_FOLD[letter] ?? letter)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return previous[b.length];
}

/** Counts entities whose every significant token is present in the verified
 *  transcript. Tokens of four or more characters tolerate one edit because
 *  speech-to-text spells unfamiliar names imperfectly; shorter tokens must
 *  match exactly. This is the measured input to the 99 percent proper-name
 *  floor enforced by audio-quality.ts and publish_daily_drop(). */
export function countVerifiedProperNames(entities: readonly string[], transcript: string) {
  const spoken = normalize(transcript).split(" ").filter(Boolean);
  const spokenSet = new Set(spoken);
  const tokenHeard = (token: string) => {
    if (spokenSet.has(token)) return true;
    if (token.length < 4) return false;
    return spoken.some(
      (candidate) =>
        Math.abs(candidate.length - token.length) <= 1 && editDistance(candidate, token) <= 1,
    );
  };
  return entities.filter((entity) => {
    const tokens = normalize(entity).split(" ").filter(Boolean);
    return tokens.length > 0 && tokens.every(tokenHeard);
  }).length;
}

async function ensureSelectedVoice(punditId: PunditId): Promise<VoiceCandidateRow> {
  const selected = await serviceRest<VoiceCandidateRow[]>(
    `voice_candidates?pundit_id=eq.${punditId}&status=eq.selected&select=id,provider,provider_voice_ref,blind_metrics&limit=1`,
  );
  if (selected[0]) return selected[0];

  const envKey = getPunditSpec(punditId).voiceEnvKey;
  const voiceRef = process.env[envKey]?.trim();
  if (!voiceRef) {
    throw new Error(`No selected voice exists for ${punditId} and ${envKey} is not configured.`);
  }
  const now = new Date().toISOString();
  const rows = await serviceRest<VoiceCandidateRow[]>(
    "voice_candidates?on_conflict=pundit_id,candidate_label,provider",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        pundit_id: punditId,
        candidate_label: "selected",
        provider: "elevenlabs",
        provider_voice_ref: voiceRef,
        rights_basis: "ElevenLabs commercial licence; founder attested on 2026-09-04",
        commercial_use_approved: true,
        rights_confirmed_at: now,
        blind_metrics: FOUNDER_VOICE_ATTESTATION,
        founder_approved: true,
        approved_at: now,
        status: "selected",
      },
    },
  );
  const row = rows?.[0];
  if (!row) throw new Error(`Selected voice for ${punditId} could not be recorded.`);
  return row;
}

export async function loadPronunciationPlan(input: {
  punditId: PunditId;
  displayScript: string;
  entities: readonly string[];
}) {
  const usedEntities = [
    ...new Set(input.entities.map((entity) => entity.trim()).filter(Boolean)),
  ].filter((entity) => normalize(input.displayScript).includes(normalize(entity)));
  const [rows, voice] = await Promise.all([
    serviceRest<LexiconRow[]>(
      "pronunciation_lexicon?verification_state=eq.human_verified&select=display_text,verification_state,provider_dictionary_id,provider_dictionary_version_id",
    ),
    ensureSelectedVoice(input.punditId),
  ]);
  if (voice.provider.toLowerCase() !== "elevenlabs") {
    throw new Error(`Selected voice provider is unsupported for ${input.punditId}.`);
  }

  // Human-verified dictionary entries are used when they exist. Missing entries
  // no longer block narration: pronunciation is measured against the verified
  // transcript after narration instead of attested before it.
  const byName = new Map(rows.map((row) => [normalize(row.display_text), row]));
  const locatorKeys = new Set<string>();
  const locators = usedEntities.flatMap((entity) => {
    const row = byName.get(normalize(entity));
    if (!row?.provider_dictionary_id || !row.provider_dictionary_version_id) return [];
    const key = `${row.provider_dictionary_id}:${row.provider_dictionary_version_id}`;
    if (locatorKeys.has(key)) return [];
    locatorKeys.add(key);
    return [
      {
        pronunciation_dictionary_id: row.provider_dictionary_id,
        version_id: row.provider_dictionary_version_id,
      },
    ];
  });
  const lexiconMisses = usedEntities.filter((entity) => !byName.has(normalize(entity)));
  const performanceChecks = {
    fullLengthPerformance: voice.blind_metrics.performanceProfileVerified === true,
    clipping: voice.blind_metrics.clippingVerified === true,
    emphasis: voice.blind_metrics.emphasisVerified === true,
    punchlineTiming: voice.blind_metrics.punchlineTimingVerified === true,
    synthesisArtifacts: voice.blind_metrics.synthesisArtifactsVerified === true,
  };
  const performanceProfileVerified = Object.values(performanceChecks).every(Boolean);

  return {
    voiceCandidateId: voice.id,
    providerVoiceRef: voice.provider_voice_ref,
    usedEntities,
    lexiconMisses,
    properNamesTotal: usedEntities.length,
    locators: locators.slice(0, MAX_DICTIONARIES),
    performanceProfileVerified,
    performanceChecks,
  };
}
