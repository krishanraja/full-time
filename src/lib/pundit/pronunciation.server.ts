import type { PunditId } from "./types";
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

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function loadPronunciationPlan(input: {
  punditId: PunditId;
  displayScript: string;
  entities: readonly string[];
}) {
  const usedEntities = [
    ...new Set(input.entities.map((entity) => entity.trim()).filter(Boolean)),
  ].filter((entity) => normalize(input.displayScript).includes(normalize(entity)));
  const [rows, voices] = await Promise.all([
    serviceRest<LexiconRow[]>(
      "pronunciation_lexicon?verification_state=eq.human_verified&select=display_text,verification_state,provider_dictionary_id,provider_dictionary_version_id",
    ),
    serviceRest<VoiceCandidateRow[]>(
      `voice_candidates?pundit_id=eq.${input.punditId}&status=eq.selected&select=id,provider,provider_voice_ref,blind_metrics&limit=1`,
    ),
  ]);
  const voice = voices[0];
  if (!voice) throw new Error(`No licensed selected voice exists for ${input.punditId}.`);
  if (voice.provider.toLowerCase() !== "elevenlabs") {
    throw new Error(`Selected voice provider is unsupported for ${input.punditId}.`);
  }

  const byName = new Map(rows.map((row) => [normalize(row.display_text), row]));
  const missing = usedEntities.filter((entity) => !byName.has(normalize(entity)));
  if (missing.length) {
    throw new Error(`Pronunciation gate has no human-verified entry for: ${missing.join(", ")}.`);
  }
  const withoutDictionary = usedEntities.filter((entity) => {
    const row = byName.get(normalize(entity));
    return !row?.provider_dictionary_id || !row.provider_dictionary_version_id;
  });
  if (withoutDictionary.length) {
    throw new Error(
      `Pronunciation dictionary locator is missing for: ${withoutDictionary.join(", ")}.`,
    );
  }

  const locatorKeys = new Set<string>();
  const locators = usedEntities.flatMap((entity) => {
    const row = byName.get(normalize(entity))!;
    const key = `${row.provider_dictionary_id}:${row.provider_dictionary_version_id}`;
    if (locatorKeys.has(key)) return [];
    locatorKeys.add(key);
    return [
      {
        pronunciation_dictionary_id: row.provider_dictionary_id!,
        version_id: row.provider_dictionary_version_id!,
      },
    ];
  });
  if (locators.length > 3) {
    throw new Error(
      `Pronunciation plan needs ${locators.length} dictionaries; ElevenLabs accepts at most 3 per request. Consolidate the verified entries before narration.`,
    );
  }
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
    properNamesTotal: usedEntities.length,
    properNamesVerified: usedEntities.length,
    pronunciationRate: 1,
    locators,
    performanceProfileVerified,
    performanceChecks,
  };
}
