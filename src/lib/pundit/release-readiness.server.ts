import { createHash } from "node:crypto";
import { validateEvaluationManifest, type EvaluationMatch } from "./evaluation";
import { extractSourceLanguageSpans } from "./research-originality.server";
import { PUNDIT_SPECS } from "./specs";
import { areConsecutiveDates, median, percentage, type ReleaseGate } from "./release-readiness";
import { serviceRest } from "./service-rest.server";
import { PUNDIT_IDS, type PunditId, type QualitativeHarness } from "./types";

const QUALITATIVE_HARNESSES = Object.keys(
  PUNDIT_SPECS.zen.requiredThresholds,
) as QualitativeHarness[];

const REQUIRED_SIGNOFFS = [
  "founder_editorial",
  "founder_humour",
  "founder_voice",
  "legal",
  "privacy",
  "accessibility",
  "monitoring",
  "rollback",
  "feed_validation",
] as const;

type EvaluationRun = {
  id: string;
  pundit_id: PunditId;
  hard_gate_pass: boolean;
  qualitative_scores: Partial<Record<QualitativeHarness, number>>;
  status: string;
};

type EvaluationReview = {
  evaluation_run_id: string;
  reviewer_panel: string;
  persona_guess: PunditId | null;
  main_claim_understood: boolean | null;
  preferred_over_current: boolean | null;
  preferred_over_generic: boolean | null;
  humour_approved: boolean | null;
};

type AudioReview = {
  variant_id: string;
  sample_seconds: number;
  persona_guess: PunditId | null;
  authority_rating: number | null;
  naturalness_rating: number | null;
  timing_rating: number | null;
  listenability_rating: number | null;
  pronunciation_errors: string[];
  clipped_words: boolean;
  repeated_phrases: boolean;
  misplaced_emphasis: boolean;
  monotone: boolean;
  overacted_punchlines: boolean;
  synthesis_artifacts: boolean;
  approved: boolean;
};

function gate(
  name: string,
  passed: boolean,
  metric: ReleaseGate["metric"],
  required: ReleaseGate["required"],
  detail: string,
): ReleaseGate {
  return { name, passed, metric, required, detail };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function evaluateReleaseReadiness(revision: string) {
  if (!revision.trim()) throw new Error("A concrete release revision is required.");
  const [
    evaluationMatches,
    evaluationRuns,
    evaluationReviews,
    voices,
    audioReviews,
    variants,
    forecastModels,
    rehearsals,
    predictions,
    signoffs,
    acceptedConcepts,
    researchSources,
  ] = await Promise.all([
    serviceRest<
      Array<{
        match_id: string;
        scenarios: EvaluationMatch["scenarios"];
        partition: EvaluationMatch["partition"];
        prompt_visible: boolean;
        founder_approved: boolean;
      }>
    >("evaluation_matches?select=match_id,scenarios,partition,prompt_visible,founder_approved"),
    serviceRest<EvaluationRun[]>(
      "evaluation_runs?harness_version=eq.pundit-v1&select=id,pundit_id,hard_gate_pass,qualitative_scores,status",
    ),
    serviceRest<EvaluationReview[]>(
      "evaluation_reviews?select=evaluation_run_id,reviewer_panel,persona_guess,main_claim_understood,preferred_over_current,preferred_over_generic,humour_approved",
    ),
    serviceRest<
      Array<{
        pundit_id: PunditId;
        candidate_label: string;
        provider: string;
        provider_voice_ref: string;
        status: string;
        full_length_sample_url: string | null;
        commercial_use_approved: boolean;
        rights_confirmed_at: string | null;
        founder_approved: boolean;
        blind_metrics: Record<string, unknown>;
      }>
    >(
      "voice_candidates?select=pundit_id,candidate_label,provider,provider_voice_ref,status,full_length_sample_url,commercial_use_approved,rights_confirmed_at,founder_approved,blind_metrics",
    ),
    serviceRest<AudioReview[]>(
      "audio_reviews?select=variant_id,sample_seconds,persona_guess,authority_rating,naturalness_rating,timing_rating,listenability_rating,pronunciation_errors,clipped_words,repeated_phrases,misplaced_emphasis,monotone,overacted_punchlines,synthesis_artifacts,approved",
    ),
    serviceRest<Array<{ id: string; pundit_id: PunditId }>>("pundit_variants?select=id,pundit_id"),
    serviceRest<
      Array<{
        version: string;
        training_matches: number;
        held_out_matches: number;
        improvement: number;
        calibration_error: number;
        passed: boolean;
        active: boolean;
      }>
    >(
      "forecast_models?active=eq.true&select=version,training_matches,held_out_matches,improvement,calibration_error,passed,active&limit=1",
    ),
    serviceRest<
      Array<{
        coverage_date: string;
        successful_variants: number;
        passed: boolean;
      }>
    >(
      "rehearsal_runs?select=coverage_date,successful_variants,passed&order=coverage_date.desc&limit=7",
    ),
    serviceRest<Array<{ pundit_id: PunditId; status: string; receipt: string | null }>>(
      "prediction_ledger?status=neq.open&select=pundit_id,status,receipt",
    ),
    serviceRest<
      Array<{
        gate: (typeof REQUIRED_SIGNOFFS)[number];
        revision: string;
        status: string;
        expires_at: string | null;
      }>
    >(
      `release_signoffs?revision=eq.${encodeURIComponent(revision)}&select=gate,revision,status,expires_at`,
    ),
    serviceRest<Array<{ source_ids: string[]; citations: unknown }>>(
      "concept_cards?status=eq.accepted&select=source_ids,citations",
    ),
    serviceRest<Array<{ id: string; status: string; expires_at: string | null }>>(
      "research_sources?select=id,status,expires_at",
    ),
  ]);

  const manifest = validateEvaluationManifest(
    evaluationMatches.map((match) => ({
      matchId: match.match_id,
      scenarios: match.scenarios,
      partition: match.partition,
      promptVisible: match.prompt_visible,
    })),
  );
  const gates: ReleaseGate[] = [];
  gates.push(
    gate(
      "evaluation_manifest",
      manifest.passed,
      evaluationMatches.length,
      60,
      manifest.failures.length
        ? manifest.failures.join(" ")
        : "Exactly 60 matches with every scenario and at least 12 prompt-hidden held-out cases.",
    ),
    gate(
      "evaluation_scripts",
      evaluationRuns.length === 360,
      evaluationRuns.length,
      360,
      "Six scripts for each evaluation match.",
    ),
    gate(
      "hard_gates",
      evaluationRuns.length === 360 && evaluationRuns.every((run) => run.hard_gate_pass),
      evaluationRuns.filter((run) => run.hard_gate_pass).length,
      360,
      "Every evaluation script passes every hard gate.",
    ),
    gate(
      "evaluation_approval",
      evaluationRuns.length === 360 && evaluationRuns.every((run) => run.status === "approved"),
      evaluationRuns.filter((run) => run.status === "approved").length,
      360,
      "No safe-but-forgettable script advances.",
    ),
  );

  for (const punditId of PUNDIT_IDS) {
    const runs = evaluationRuns.filter((run) => run.pundit_id === punditId);
    for (const harness of QUALITATIVE_HARNESSES) {
      const value = median(runs.map((run) => Number(run.qualitative_scores[harness] ?? 0)));
      const floor = PUNDIT_SPECS[punditId].requiredThresholds[harness];
      gates.push(
        gate(
          `median_${punditId}_${harness}`,
          value >= floor,
          value,
          floor,
          "Per-pundit median; dimensions are never averaged together.",
        ),
      );
    }
  }

  const runPundit = new Map(evaluationRuns.map((run) => [run.id, run.pundit_id]));
  for (const punditId of PUNDIT_IDS) {
    const reviews = evaluationReviews.filter(
      (review) => runPundit.get(review.evaluation_run_id) === punditId,
    );
    const personaAccuracy = percentage(
      reviews
        .filter((review) => review.persona_guess !== null)
        .map((review) => review.persona_guess === punditId),
    );
    const comprehension = percentage(
      reviews
        .filter((review) => review.main_claim_understood !== null)
        .map((review) => review.main_claim_understood === true),
    );
    const currentPreference = percentage(
      reviews
        .filter((review) => review.preferred_over_current !== null)
        .map((review) => review.preferred_over_current === true),
    );
    const genericPreference = percentage(
      reviews
        .filter((review) => review.preferred_over_generic !== null)
        .map((review) => review.preferred_over_generic === true),
    );
    gates.push(
      gate(
        `blind_persona_script_${punditId}`,
        personaAccuracy >= 0.8,
        personaAccuracy,
        0.8,
        "Per-pundit blind script persona identification.",
      ),
      gate(
        `casual_fan_comprehension_${punditId}`,
        comprehension >= 0.8,
        comprehension,
        0.8,
        "Per-pundit main-claim comprehension after one pass.",
      ),
      gate(
        `preference_current_${punditId}`,
        currentPreference >= 0.7,
        currentPreference,
        0.7,
        "Per-pundit blind preference over the current production baseline.",
      ),
      gate(
        `preference_generic_${punditId}`,
        genericPreference >= 0.7,
        genericPreference,
        0.7,
        "Per-pundit blind preference over a generic model script.",
      ),
    );
  }

  const founderHumour = new Set(
    evaluationReviews
      .filter((review) => review.reviewer_panel === "founder" && review.humour_approved)
      .map((review) => runPundit.get(review.evaluation_run_id))
      .filter((value): value is PunditId => Boolean(value)),
  );
  const goldMatches = evaluationMatches.filter((match) => match.partition === "gold");
  gates.push(
    gate(
      "founder_gold_examples",
      goldMatches.length >= 6 && goldMatches.every((match) => match.founder_approved),
      goldMatches.filter((match) => match.founder_approved).length,
      goldMatches.length,
      "All selected gold examples have founder approval.",
    ),
    gate(
      "founder_humour_samples",
      founderHumour.size === 6,
      founderHumour.size,
      6,
      "Founder-approved humour exists for every pundit.",
    ),
  );

  const selectedVoices = voices.filter((voice) => voice.status === "selected");
  const auditionCoverage = PUNDIT_IDS.every(
    (pundit) =>
      new Set(
        voices
          .filter(
            (voice) =>
              voice.pundit_id === pundit &&
              voice.full_length_sample_url &&
              voice.commercial_use_approved &&
              voice.rights_confirmed_at,
          )
          .map((voice) => `${voice.provider}:${voice.provider_voice_ref}`),
      ).size >= 2,
  );
  const requiredVoiceChecks = [
    "performanceProfileVerified",
    "clippingVerified",
    "emphasisVerified",
    "punchlineTimingVerified",
    "synthesisArtifactsVerified",
  ];
  const licensedSelected =
    selectedVoices.length === 6 &&
    new Set(selectedVoices.map((voice) => voice.pundit_id)).size === 6 &&
    new Set(selectedVoices.map((voice) => `${voice.provider}:${voice.provider_voice_ref}`)).size ===
      6 &&
    selectedVoices.every(
      (voice) =>
        voice.commercial_use_approved &&
        voice.founder_approved &&
        Boolean(voice.rights_confirmed_at) &&
        Boolean(voice.full_length_sample_url) &&
        requiredVoiceChecks.every((check) => voice.blind_metrics[check] === true),
    );
  gates.push(
    gate(
      "voice_auditions",
      auditionCoverage,
      auditionCoverage,
      true,
      "At least two rights-cleared full-length candidates per pundit.",
    ),
    gate(
      "voice_licensing",
      licensedSelected,
      selectedVoices.length,
      6,
      "Six distinct selected, founder-approved, commercially licensed voices.",
    ),
  );

  const variantPundit = new Map(variants.map((variant) => [variant.id, variant.pundit_id]));
  const fullAudioReviews = audioReviews.filter((review) => review.sample_seconds >= 300);
  const ratingKeys = [
    "authority_rating",
    "naturalness_rating",
    "timing_rating",
    "listenability_rating",
  ] as const;
  for (const punditId of PUNDIT_IDS) {
    const reviews = fullAudioReviews.filter(
      (review) => variantPundit.get(review.variant_id) === punditId,
    );
    const audioPersona = percentage(
      reviews
        .filter((review) => review.persona_guess !== null)
        .map((review) => review.persona_guess === punditId),
    );
    gates.push(
      gate(
        `blind_persona_audio_${punditId}`,
        audioPersona >= 0.8,
        audioPersona,
        0.8,
        "Per-pundit blind audio-only identification on full-length samples.",
      ),
    );
    for (const ratingKey of ratingKeys) {
      const ratings = reviews
        .map((review) => review[ratingKey])
        .filter((value): value is number => value !== null);
      const mean = ratings.length
        ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
        : 0;
      gates.push(
        gate(
          `audio_${ratingKey}_${punditId}`,
          mean >= 4,
          mean,
          4,
          "Per-pundit full-length human audio rating.",
        ),
      );
    }
    const defects = reviews.filter(
      (review) =>
        review.pronunciation_errors.length > 0 ||
        review.clipped_words ||
        review.repeated_phrases ||
        review.misplaced_emphasis ||
        review.monotone ||
        review.overacted_punchlines ||
        review.synthesis_artifacts ||
        !review.approved,
    ).length;
    gates.push(
      gate(
        `audio_defects_${punditId}`,
        reviews.length > 0 && defects === 0,
        defects,
        0,
        "No full-length pronunciation, clipping, repetition, emphasis, monotone, overacting or synthesis defect.",
      ),
    );
  }

  const forecast = forecastModels[0];
  gates.push(
    gate(
      "forecast_backtest",
      Boolean(
        forecast?.active &&
        forecast.passed &&
        Number(forecast.improvement) > 0 &&
        forecast.training_matches >= 400 &&
        forecast.held_out_matches >= 100,
      ),
      Number(forecast?.improvement ?? 0),
      "> 0 versus baseline",
      "Active forecast beats the base-rate baseline on a held-out set.",
    ),
    gate(
      "forecast_calibration",
      Boolean(forecast?.active && Number(forecast.calibration_error) <= 0.1),
      Number(forecast?.calibration_error ?? 1),
      "<= 0.10",
      "Held-out expected calibration error for the active shared forecast.",
    ),
  );

  const rehearsalDates = rehearsals.map((run) => run.coverage_date);
  gates.push(
    gate(
      "seven_rehearsals",
      rehearsals.length === 7 &&
        rehearsals.every((run) => run.passed && run.successful_variants === 6) &&
        areConsecutiveDates(rehearsalDates),
      rehearsals.filter((run) => run.passed && run.successful_variants === 6).length,
      7,
      "Seven consecutive on-time six-variant rehearsals.",
    ),
  );

  const settledPundits = new Set(
    predictions
      .filter((prediction) => prediction.receipt)
      .map((prediction) => prediction.pundit_id),
  );
  gates.push(
    gate(
      "prediction_receipts",
      settledPundits.size === 6 && predictions.every((prediction) => Boolean(prediction.receipt)),
      settledPundits.size,
      6,
      "Every pundit has a settled, non-evasive public receipt.",
    ),
  );

  const now = Date.now();
  const validSignoffs = new Set(
    signoffs
      .filter(
        (signoff) =>
          signoff.status === "approved" &&
          (!signoff.expires_at || new Date(signoff.expires_at).getTime() > now),
      )
      .map((signoff) => signoff.gate),
  );
  gates.push(
    gate(
      "release_signoffs",
      REQUIRED_SIGNOFFS.every((name) => validSignoffs.has(name)),
      validSignoffs.size,
      REQUIRED_SIGNOFFS.length,
      "Founder, legal, privacy, accessibility, monitoring, rollback and feed evidence is revision-bound.",
    ),
  );

  const sourceById = new Map(researchSources.map((source) => [source.id, source]));
  const rightsSafe =
    acceptedConcepts.length > 0 &&
    researchSources.length > 0 &&
    acceptedConcepts.every(
      (card) =>
        card.source_ids.length > 0 &&
        extractSourceLanguageSpans(card.citations).length > 0 &&
        card.source_ids.every((id) => {
          const source = sourceById.get(id);
          return Boolean(
            source?.status === "approved" &&
            (!source.expires_at || new Date(source.expires_at).getTime() > now),
          );
        }),
    );
  gates.push(
    gate(
      "research_rights",
      rightsSafe,
      rightsSafe,
      true,
      "Every accepted concept traces to a currently approved source and records licensed source-language spans for similarity checks.",
    ),
    gate(
      "tts_capacity",
      Number(process.env.TTS_MONTHLY_CHARACTER_CAPACITY ?? 0) >= 1_500_000,
      Number(process.env.TTS_MONTHLY_CHARACTER_CAPACITY ?? 0),
      1_500_000,
      "Provisioned monthly character capacity.",
    ),
    gate(
      "tts_alerting",
      process.env.TTS_USAGE_ALERTING_CONFIGURED === "true",
      process.env.TTS_USAGE_ALERTING_CONFIGURED === "true",
      true,
      "Usage alerting is explicitly configured.",
    ),
    gate(
      "prelaunch_truthfulness",
      process.env.PRELAUNCH_MODE !== "false" && process.env.BILLING_ENABLED !== "true",
      process.env.PRELAUNCH_MODE !== "false",
      true,
      "Readiness is evaluated while public launch and billing remain fail-closed.",
    ),
  );

  const snapshot = {
    revision,
    harnessVersion: "pundit-v1",
    evaluatedAt: new Date().toISOString(),
    passed: gates.every((item) => item.passed),
    gates,
  };
  const hash = createHash("sha256").update(stable(snapshot)).digest("hex");
  return { snapshot, hash };
}

export async function persistPassingReleaseSnapshot(revision: string) {
  const result = await evaluateReleaseReadiness(revision);
  if (!result.snapshot.passed)
    throw new Error("Release gates are incomplete; snapshot was not promoted.");
  await serviceRest<null>("release_gate_runs?on_conflict=revision,snapshot_hash", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: {
      revision,
      snapshot: result.snapshot,
      snapshot_hash: result.hash,
      passed: true,
    },
  });
  await serviceRest<null>("release_state?singleton=eq.true", {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: "launch_ready",
      public_launch_enabled: false,
      billing_enabled: false,
      all_six_free: true,
      gate_snapshot: result.snapshot,
      gate_snapshot_hash: result.hash,
      gates_verified_at: result.snapshot.evaluatedAt,
      verified_revision: revision,
    },
  });
  return result;
}
