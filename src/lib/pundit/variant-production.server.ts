import { evaluateAudioQuality, type AudioQualityMetrics } from "./audio-quality";
import { masterNarrationAudio } from "./audio-mastering.server";
import { storeVariantAssets } from "./asset-storage.server";
import { countVerifiedProperNames, loadPronunciationPlan } from "./pronunciation.server";
import { renderPunditShareCard } from "./share-card.server";
import { serviceRest } from "./service-rest.server";
import type { GeneratedPunditVariant } from "./pundit-generator.server";
import { spokenIdentity } from "@/lib/api/narration.server";

type ExistingProducedVariant = {
  pundit_id: string;
  status: string;
  audio_url: string | null;
  audio_storage_path: string | null;
  share_image_url: string | null;
  share_storage_path: string | null;
  script_identity_verified: boolean;
  pronunciation_rate: number | null;
  audio_quality: { passed?: boolean } | null;
};

function repeatedTranscriptPhrase(transcript: string, script: string) {
  const words = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const counts = (tokens: string[]) => {
    const result = new Map<string, number>();
    for (let index = 0; index <= tokens.length - 6; index++) {
      const phrase = tokens.slice(index, index + 6).join(" ");
      result.set(phrase, (result.get(phrase) ?? 0) + 1);
    }
    return result;
  };
  const transcriptCounts = counts(words(transcript));
  const scriptCounts = counts(words(script));
  return [...transcriptCounts].some(
    ([phrase, count]) => count > 1 && count > (scriptCounts.get(phrase) ?? 0),
  );
}

async function quarantineVariant(variantId: string, failure: string, quality?: unknown) {
  await serviceRest<null>(`pundit_variants?id=eq.${encodeURIComponent(variantId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: "quarantined",
      audio_quality: { passed: false, failures: [failure], detail: quality ?? null },
      audio_quality_verified_at: new Date().toISOString(),
    },
  });
}

export async function producePunditVariant(input: {
  dropId: string;
  coverageDate: string;
  variantId: string;
  generated: GeneratedPunditVariant;
  entities: readonly string[];
}) {
  const candidate = input.generated.candidate;
  const existing = await serviceRest<ExistingProducedVariant[]>(
    `pundit_variants?id=eq.${encodeURIComponent(input.variantId)}&select=pundit_id,status,audio_url,audio_storage_path,share_image_url,share_storage_path,script_identity_verified,pronunciation_rate,audio_quality&limit=1`,
  );
  const prior = existing[0];
  if (
    prior &&
    ["approved", "published"].includes(prior.status) &&
    prior.pundit_id === candidate.punditId &&
    prior.audio_url &&
    prior.audio_storage_path &&
    prior.share_image_url &&
    prior.share_storage_path &&
    prior.script_identity_verified &&
    (prior.pronunciation_rate ?? 0) >= 0.99 &&
    prior.audio_quality?.passed === true
  ) {
    return {
      punditId: candidate.punditId,
      passed: true,
      reused: true,
      assets: {
        audioUrl: prior.audio_url,
        audioPath: prior.audio_storage_path,
        shareImageUrl: prior.share_image_url,
        sharePath: prior.share_storage_path,
      },
    } as const;
  }
  if (input.generated.status !== "approved") {
    await quarantineVariant(input.variantId, "Editorial harnesses did not approve the script.");
    return { punditId: candidate.punditId, passed: false, failures: ["editorial"] } as const;
  }

  try {
    const pronunciation = await loadPronunciationPlan({
      punditId: candidate.punditId,
      displayScript: candidate.displayScript,
      entities: input.entities,
    });
    const { narrate } = await import("@/lib/api/narration.server");
    const narration = await narrate(
      candidate.displayScript,
      candidate.outline.portable_line,
      `${candidate.punditId}:${input.dropId}`,
      pronunciation.usedEntities,
      {
        punditId: candidate.punditId,
        performancePlan: candidate.performancePlan,
        voiceId: pronunciation.providerVoiceRef,
        pronunciationDictionaryLocators: pronunciation.locators,
      },
    );
    const mastered = await masterNarrationAudio({
      audio: narration.audio,
      script: candidate.displayScript,
    });
    const properNamesVerified = countVerifiedProperNames(
      pronunciation.usedEntities,
      narration.fidelity.transcript,
    );
    const metrics: AudioQualityMetrics = {
      ...mastered.metrics,
      properNamesVerified,
      properNamesTotal: pronunciation.properNamesTotal,
      transcriptVerified: narration.fidelity.wer <= 0.05,
      numbersVerified: narration.fidelity.numbers,
      performanceProfileVerified: pronunciation.performanceProfileVerified,
      clippedWords: narration.fidelity.wer > 0.03 || !pronunciation.performanceChecks.clipping,
      repeatedPhrases: repeatedTranscriptPhrase(
        narration.fidelity.transcript,
        candidate.displayScript,
      ),
      misplacedEmphasis: !pronunciation.performanceChecks.emphasis,
      monotone: mastered.metrics.dynamicRangeDb < 3,
      overactedPunchlines: !pronunciation.performanceChecks.punchlineTiming,
      synthesisArtifacts:
        narration.fidelity.wer > 0.05 || !pronunciation.performanceChecks.synthesisArtifacts,
    };
    const quality = evaluateAudioQuality(metrics);
    const identityVerified = spokenIdentity(narration.spokenScript, candidate.displayScript);
    if (!identityVerified)
      quality.failures.push("Spoken and display scripts are not semantically identical.");
    if (!identityVerified || !quality.passed) {
      await quarantineVariant(input.variantId, quality.failures.join(" "), {
        metrics,
        mastering: mastered.mastering,
      });
      return {
        punditId: candidate.punditId,
        passed: false,
        failures: quality.failures,
      } as const;
    }

    const shareImage = await renderPunditShareCard({
      punditId: candidate.punditId,
      title: candidate.thesis.headline,
      portableLine: candidate.outline.portable_line,
      coverageDate: input.coverageDate,
    });
    const assets = await storeVariantAssets({
      dropId: input.dropId,
      punditId: candidate.punditId,
      audio: mastered.audio,
      shareImage,
    });
    const verifiedAt = new Date().toISOString();
    await serviceRest<null>(`pundit_variants?id=eq.${encodeURIComponent(input.variantId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        voice_candidate_id: pronunciation.voiceCandidateId,
        spoken_script: narration.spokenScript,
        audio_url: assets.audioUrl,
        audio_bytes: mastered.audio.byteLength,
        audio_duration_sec: Math.max(1, Math.round(mastered.metrics.durationSec)),
        audio_storage_path: assets.audioPath,
        share_image_url: assets.shareImageUrl,
        share_storage_path: assets.sharePath,
        transcript: narration.fidelity.transcript,
        script_identity_verified: true,
        audio_quality: {
          passed: true,
          failures: [],
          lexiconMisses: pronunciation.lexiconMisses,
          metrics,
          mastering: mastered.mastering,
          fidelityWer: narration.fidelity.wer,
          ttsSegments: narration.ttsSegments,
        },
        audio_quality_verified_at: verifiedAt,
        pronunciation_rate: quality.pronunciationRate,
        tts_model: narration.ttsModel,
        tts_voice_id: narration.ttsVoiceId,
        tts_seed: narration.ttsSeed,
        status: "approved",
      },
    });
    return { punditId: candidate.punditId, passed: true, assets, metrics } as const;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    await quarantineVariant(input.variantId, failure);
    return { punditId: candidate.punditId, passed: false, failures: [failure] } as const;
  }
}
