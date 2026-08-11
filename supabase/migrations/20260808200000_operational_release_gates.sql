-- Full Time operational release gates.
--
-- This migration is additive. It does not enable public launch, publish a
-- variant, charge a user, or write provider credentials.

CREATE TABLE public.voice_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pundit_id TEXT NOT NULL CHECK (pundit_id IN ('zen','gaffer','stats','romantic','doomer','banter')),
  candidate_label TEXT NOT NULL CHECK (candidate_label IN ('A','B','selected')),
  provider TEXT NOT NULL,
  provider_voice_ref TEXT NOT NULL,
  rights_basis TEXT,
  commercial_use_approved BOOLEAN NOT NULL DEFAULT false,
  rights_confirmed_at TIMESTAMPTZ,
  full_length_sample_url TEXT,
  blind_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','audition','licensed','selected','rejected','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pundit_id, candidate_label, provider),
  UNIQUE (provider, provider_voice_ref),
  CHECK (
    status <> 'selected' OR (
      commercial_use_approved AND
      rights_confirmed_at IS NOT NULL AND
      founder_approved AND
      approved_at IS NOT NULL
    )
  )
);
CREATE UNIQUE INDEX voice_candidates_one_selected_per_pundit_idx
  ON public.voice_candidates(pundit_id) WHERE status = 'selected';
GRANT ALL ON public.voice_candidates TO service_role;
ALTER TABLE public.voice_candidates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER voice_candidates_updated_at BEFORE UPDATE ON public.voice_candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.pundit_variants
  ADD CONSTRAINT pundit_variants_voice_candidate_fk
  FOREIGN KEY (voice_candidate_id) REFERENCES public.voice_candidates(id) ON DELETE RESTRICT;

CREATE TABLE public.audio_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.pundit_variants(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_panel TEXT NOT NULL CHECK (reviewer_panel IN ('fan','analyst','founder','audio_producer')),
  sample_seconds INT NOT NULL CHECK (sample_seconds >= 20),
  persona_guess TEXT CHECK (
    persona_guess IS NULL OR persona_guess IN ('zen','gaffer','stats','romantic','doomer','banter')
  ),
  authority_rating INT CHECK (authority_rating BETWEEN 1 AND 5),
  naturalness_rating INT CHECK (naturalness_rating BETWEEN 1 AND 5),
  timing_rating INT CHECK (timing_rating BETWEEN 1 AND 5),
  listenability_rating INT CHECK (listenability_rating BETWEEN 1 AND 5),
  pronunciation_errors TEXT[] NOT NULL DEFAULT '{}',
  clipped_words BOOLEAN NOT NULL DEFAULT false,
  repeated_phrases BOOLEAN NOT NULL DEFAULT false,
  misplaced_emphasis BOOLEAN NOT NULL DEFAULT false,
  monotone BOOLEAN NOT NULL DEFAULT false,
  overacted_punchlines BOOLEAN NOT NULL DEFAULT false,
  synthesis_artifacts BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audio_reviews_variant_idx ON public.audio_reviews(variant_id, created_at DESC);
GRANT ALL ON public.audio_reviews TO service_role;
ALTER TABLE public.audio_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  trained_from DATE NOT NULL,
  trained_to DATE NOT NULL,
  held_out_from DATE NOT NULL,
  held_out_to DATE NOT NULL,
  training_matches INT NOT NULL CHECK (training_matches > 0),
  held_out_matches INT NOT NULL CHECK (held_out_matches > 0),
  model_brier NUMERIC NOT NULL CHECK (model_brier >= 0),
  baseline_brier NUMERIC NOT NULL CHECK (baseline_brier >= 0),
  improvement NUMERIC NOT NULL,
  calibration_buckets JSONB NOT NULL,
  calibration_error NUMERIC NOT NULL CHECK (calibration_error BETWEEN 0 AND 1),
  ratings JSONB NOT NULL,
  parameters JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT active OR passed),
  CHECK (trained_from <= trained_to),
  CHECK (held_out_from <= held_out_to)
);
CREATE UNIQUE INDEX forecast_models_one_active_idx ON public.forecast_models(active) WHERE active;
GRANT SELECT ON public.forecast_models TO anon, authenticated;
GRANT ALL ON public.forecast_models TO service_role;
ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passing active forecast is public" ON public.forecast_models
  FOR SELECT TO anon, authenticated USING (active AND passed);

CREATE TABLE public.team_season_status (
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season INT NOT NULL,
  promoted BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, team_id, season)
);
GRANT ALL ON public.team_season_status TO service_role;
ALTER TABLE public.team_season_status ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS season INT;
CREATE INDEX IF NOT EXISTS matches_league_season_kickoff_idx
  ON public.matches(league_id, season, kickoff_at);

CREATE TABLE public.evaluation_matches (
  match_id TEXT PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  scenarios TEXT[] NOT NULL,
  partition TEXT NOT NULL CHECK (partition IN ('gold','anti_example','held_out','adversarial')),
  prompt_visible BOOLEAN NOT NULL,
  source TEXT NOT NULL,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(scenarios) > 0),
  CHECK (partition <> 'held_out' OR NOT prompt_visible)
);
GRANT ALL ON public.evaluation_matches TO service_role;
ALTER TABLE public.evaluation_matches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES public.evaluation_matches(match_id) ON DELETE CASCADE,
  pundit_id TEXT NOT NULL CHECK (pundit_id IN ('zen','gaffer','stats','romantic','doomer','banter')),
  harness_version TEXT NOT NULL,
  spec_version INT NOT NULL,
  blind_label TEXT NOT NULL,
  candidate JSONB NOT NULL,
  hard_gate_pass BOOLEAN NOT NULL,
  qualitative_scores JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved','quarantined','failed')),
  attempts INT NOT NULL CHECK (attempts BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, pundit_id, harness_version, spec_version)
);
CREATE INDEX evaluation_runs_status_idx ON public.evaluation_runs(status, created_at DESC);
GRANT ALL ON public.evaluation_runs TO service_role;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.evaluation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_run_id UUID NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_panel TEXT NOT NULL CHECK (reviewer_panel IN ('fan','analyst','founder')),
  persona_guess TEXT CHECK (
    persona_guess IS NULL OR persona_guess IN ('zen','gaffer','stats','romantic','doomer','banter')
  ),
  main_claim_understood BOOLEAN,
  preferred_over_current BOOLEAN,
  preferred_over_generic BOOLEAN,
  humour_approved BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evaluation_reviews_run_idx ON public.evaluation_reviews(evaluation_run_id);
GRANT ALL ON public.evaluation_reviews TO service_role;
ALTER TABLE public.evaluation_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.editorial_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  coverage_date DATE NOT NULL,
  match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('editorial','full_rehearsal','publication')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','narration_review','passed','quarantined','failed')),
  harness_version TEXT NOT NULL,
  request_id TEXT,
  promise_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  failure TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX editorial_runs_date_idx ON public.editorial_runs(coverage_date DESC, created_at DESC);
GRANT ALL ON public.editorial_runs TO service_role;
ALTER TABLE public.editorial_runs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER editorial_runs_updated_at BEFORE UPDATE ON public.editorial_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_editorial_run(
  target_key TEXT,
  target_coverage_date DATE,
  target_mode TEXT,
  target_harness_version TEXT,
  target_request_id TEXT
)
RETURNS SETOF public.editorial_runs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.editorial_runs (
    idempotency_key, coverage_date, mode, status, harness_version, request_id, started_at
  ) VALUES (
    target_key, target_coverage_date, target_mode, 'running', target_harness_version,
    target_request_id, now()
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET status = 'running',
      request_id = EXCLUDED.request_id,
      started_at = now(),
      finished_at = NULL,
      failure = NULL
  WHERE public.editorial_runs.status IN ('queued','quarantined','failed')
     OR public.editorial_runs.request_id = EXCLUDED.request_id
     OR public.editorial_runs.started_at < now() - interval '3 hours'
  RETURNING public.editorial_runs.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_editorial_run(TEXT, DATE, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_editorial_run(TEXT, DATE, TEXT, TEXT, TEXT)
  TO service_role;

CREATE TABLE public.rehearsal_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_run_id UUID NOT NULL UNIQUE REFERENCES public.editorial_runs(id) ON DELETE CASCADE,
  coverage_date DATE NOT NULL,
  drop_id UUID REFERENCES public.daily_drops(id) ON DELETE SET NULL,
  expected_variants INT NOT NULL DEFAULT 6 CHECK (expected_variants = 6),
  successful_variants INT NOT NULL DEFAULT 0 CHECK (successful_variants BETWEEN 0 AND 6),
  deadline_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  promise_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coverage_date)
);
CREATE INDEX rehearsal_runs_passed_date_idx ON public.rehearsal_runs(passed, coverage_date DESC);
GRANT ALL ON public.rehearsal_runs TO service_role;
ALTER TABLE public.rehearsal_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.release_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate TEXT NOT NULL CHECK (gate IN (
    'founder_editorial','founder_humour','founder_voice','legal','privacy',
    'accessibility','monitoring','rollback','feed_validation'
  )),
  revision TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('approved','rejected','expired')),
  signed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gate, revision)
);
GRANT ALL ON public.release_signoffs TO service_role;
ALTER TABLE public.release_signoffs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.release_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  status TEXT NOT NULL DEFAULT 'prelaunch' CHECK (status IN ('prelaunch','launch_ready','live','paused')),
  public_launch_enabled BOOLEAN NOT NULL DEFAULT false,
  billing_enabled BOOLEAN NOT NULL DEFAULT false,
  all_six_free BOOLEAN NOT NULL DEFAULT true,
  gate_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  gate_snapshot_hash TEXT,
  gates_verified_at TIMESTAMPTZ,
  verified_revision TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT public_launch_enabled OR (
    status IN ('launch_ready','live') AND
    gates_verified_at IS NOT NULL AND
    gate_snapshot_hash IS NOT NULL AND
    verified_revision IS NOT NULL
  )),
  CHECK (NOT billing_enabled OR public_launch_enabled)
);
INSERT INTO public.release_state(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;
GRANT ALL ON public.release_state TO service_role;
ALTER TABLE public.release_state ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER release_state_updated_at BEFORE UPDATE ON public.release_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.release_gate_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (revision, snapshot_hash)
);
CREATE INDEX release_gate_runs_revision_idx
  ON public.release_gate_runs(revision, created_at DESC);
GRANT ALL ON public.release_gate_runs TO service_role;
ALTER TABLE public.release_gate_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_drops
  ADD COLUMN IF NOT EXISTS promise_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS promise_checked_at TIMESTAMPTZ;

ALTER TABLE public.pronunciation_lexicon
  ADD COLUMN IF NOT EXISTS provider_dictionary_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_dictionary_version_id TEXT;

CREATE OR REPLACE FUNCTION public.protect_published_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'published pundit variants are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_published_variant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_published_variant() TO service_role;
CREATE TRIGGER pundit_variants_immutable_after_publication
  BEFORE UPDATE OR DELETE ON public.pundit_variants
  FOR EACH ROW EXECUTE FUNCTION public.protect_published_variant();

CREATE OR REPLACE FUNCTION public.publish_daily_drop(target_drop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  release_row public.release_state%ROWTYPE;
  drop_row public.daily_drops%ROWTYPE;
  variant_count INT;
  pundit_count INT;
  audio_count INT;
  failed_latest_harnesses INT;
  missing_required_harnesses INT;
  unlicensed_voices INT;
  now_at TIMESTAMPTZ := now();
  checks JSONB;
BEGIN
  SELECT * INTO drop_row FROM public.daily_drops WHERE id = target_drop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'daily drop not found'; END IF;
  IF drop_row.status = 'published' THEN
    RETURN COALESCE(drop_row.promise_checks, '{}'::JSONB);
  END IF;

  SELECT * INTO release_row FROM public.release_state WHERE singleton = true FOR UPDATE;
  IF release_row.public_launch_enabled IS DISTINCT FROM true OR release_row.gates_verified_at IS NULL THEN
    RAISE EXCEPTION 'public launch is fail-closed';
  END IF;
  PERFORM 1
  FROM public.release_gate_runs
  WHERE revision = release_row.verified_revision
    AND snapshot_hash = release_row.gate_snapshot_hash
    AND passed
    AND COALESCE((snapshot->>'passed')::boolean, false);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'release state is not backed by a passing immutable gate snapshot';
  END IF;

  SELECT
    count(*),
    count(DISTINCT pundit_id),
    count(DISTINCT audio_url)
  INTO variant_count, pundit_count, audio_count
  FROM public.pundit_variants
  WHERE drop_id = target_drop_id
    AND status = 'approved'
    AND audio_url IS NOT NULL
    AND audio_bytes > 0
    AND audio_duration_sec > 0
    AND share_image_url IS NOT NULL
    AND transcript IS NOT NULL
    AND script_identity_verified
    AND audio_quality_verified_at IS NOT NULL
    AND COALESCE((audio_quality->>'passed')::boolean, false)
    AND pronunciation_rate >= 0.99;

  WITH latest AS (
    SELECT DISTINCT ON (variant_id, harness_name)
      variant_id, harness_name, passed
    FROM public.harness_runs
    WHERE variant_id IN (SELECT id FROM public.pundit_variants WHERE drop_id = target_drop_id)
    ORDER BY variant_id, harness_name, attempt DESC, created_at DESC
  )
  SELECT count(*) INTO failed_latest_harnesses FROM latest WHERE NOT passed;

  WITH required(name) AS (
    SELECT unnest(ARRAY[
      'evidence_to_claim_entailment','unsupported_tactics','numeric_licence',
      'entity_licence','consequence_licence','generic_language','research_originality',
      'humour_safety','prediction_timestamp','display_spoken_identity','spoken_length',
      'factual_entailment','humour_safety_semantic','insight','clarity','judgment',
      'outcome_separation','probability','independence','story','persona','humour',
      'memorability','restraint','prediction_accountability'
    ]::TEXT[])
  ), latest AS (
    SELECT DISTINCT ON (variant_id, harness_name)
      variant_id, harness_name, passed
    FROM public.harness_runs
    WHERE variant_id IN (SELECT id FROM public.pundit_variants WHERE drop_id = target_drop_id)
    ORDER BY variant_id, harness_name, attempt DESC, created_at DESC
  )
  SELECT count(*) INTO missing_required_harnesses
  FROM public.pundit_variants variants
  CROSS JOIN required
  LEFT JOIN latest
    ON latest.variant_id = variants.id AND latest.harness_name = required.name
  WHERE variants.drop_id = target_drop_id
    AND (latest.variant_id IS NULL OR NOT latest.passed);

  SELECT count(*) INTO unlicensed_voices
  FROM public.pundit_variants pv
  LEFT JOIN public.voice_candidates vc ON vc.id = pv.voice_candidate_id
  WHERE pv.drop_id = target_drop_id
    AND (
      vc.id IS NULL OR
      vc.status <> 'selected' OR
      NOT vc.commercial_use_approved OR
      NOT vc.founder_approved OR
      vc.rights_confirmed_at IS NULL OR
      pv.tts_voice_id IS DISTINCT FROM vc.provider_voice_ref
    );

  IF variant_count <> 6 OR pundit_count <> 6 OR audio_count <> 6 OR
     failed_latest_harnesses <> 0 OR missing_required_harnesses <> 0 OR
     unlicensed_voices <> 0 THEN
    RAISE EXCEPTION 'drop promise checks failed';
  END IF;

  checks := jsonb_build_object(
    'variantCount', variant_count,
    'punditCount', pundit_count,
    'distinctAudioCount', audio_count,
    'failedLatestHarnesses', failed_latest_harnesses,
    'missingRequiredHarnesses', missing_required_harnesses,
    'unlicensedVoices', unlicensed_voices,
    'verifiedAt', now_at
  );

  UPDATE public.pundit_variants
  SET status = 'published', published_at = now_at
  WHERE drop_id = target_drop_id AND status = 'approved';

  UPDATE public.daily_drops
  SET status = 'published', published_at = now_at, promise_checks = checks, promise_checked_at = now_at
  WHERE id = target_drop_id;

  RETURN checks;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_daily_drop(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_daily_drop(UUID) TO service_role;
