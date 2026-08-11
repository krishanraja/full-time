-- Full Time world-class pundit system. This migration is additive. It creates
-- the pre-launch editorial ledger but does not publish or bill anything.

CREATE TABLE public.daily_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_date DATE NOT NULL UNIQUE,
  canonical_pundit TEXT NOT NULL DEFAULT 'zen'
    CHECK (canonical_pundit IN ('zen','gaffer','stats','romantic','doomer','banter')),
  status TEXT NOT NULL DEFAULT 'building'
    CHECK (status IN (
      'building','editorial_review','narration_review','approved','published',
      'quarantined','failed','off_day'
    )),
  harness_version TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX daily_drops_status_date_idx ON public.daily_drops(status, coverage_date DESC);
GRANT SELECT ON public.daily_drops TO anon, authenticated;
GRANT ALL ON public.daily_drops TO service_role;
ALTER TABLE public.daily_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published daily drops are public" ON public.daily_drops
  FOR SELECT TO anon, authenticated USING (status IN ('published','off_day'));
CREATE TRIGGER daily_drops_updated_at BEFORE UPDATE ON public.daily_drops
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.evidence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID REFERENCES public.daily_drops(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  facts JSONB NOT NULL,
  derivations JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance JSONB NOT NULL,
  unavailable_evidence TEXT[] NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL,
  sealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, version),
  UNIQUE (content_hash)
);
CREATE INDEX evidence_packs_drop_idx ON public.evidence_packs(drop_id);
GRANT ALL ON public.evidence_packs TO service_role;
ALTER TABLE public.evidence_packs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_sealed_evidence_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.sealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'sealed evidence packs are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION public.prevent_sealed_evidence_mutation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER evidence_packs_immutable
  BEFORE UPDATE OR DELETE ON public.evidence_packs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sealed_evidence_mutation();

CREATE TABLE public.analysis_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_pack_id UUID NOT NULL REFERENCES public.evidence_packs(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  pundit_id TEXT CHECK (pundit_id IS NULL OR pundit_id IN ('zen','gaffer','stats','romantic','doomer','banter')),
  type TEXT NOT NULL CHECK (type IN (
    'fact','mechanism','decision_quality','probability','counterfactual','opinion','prediction'
  )),
  thesis TEXT NOT NULL,
  evidence_refs TEXT[] NOT NULL,
  adjustment_evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  alternative_explanation TEXT,
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  falsifier TEXT,
  evaluation_rule JSONB,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','licensed','rejected','quarantined')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(evidence_refs) > 0),
  CHECK (type <> 'prediction' OR (falsifier IS NOT NULL AND evaluation_rule IS NOT NULL))
);
CREATE INDEX analysis_claims_pack_idx ON public.analysis_claims(evidence_pack_id, status);
GRANT ALL ON public.analysis_claims TO service_role;
ALTER TABLE public.analysis_claims ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pundit_specs (
  pundit_id TEXT NOT NULL CHECK (pundit_id IN ('zen','gaffer','stats','romantic','doomer','banter')),
  version INT NOT NULL,
  name TEXT NOT NULL,
  doctrine JSONB NOT NULL,
  analytical_weights JSONB NOT NULL,
  evidence_preferences JSONB NOT NULL,
  humour_profile JSONB NOT NULL,
  language_profile JSONB NOT NULL,
  prediction_profile JSONB NOT NULL,
  performance_profile JSONB NOT NULL,
  required_thresholds JSONB NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  anti_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pundit_id, version)
);
GRANT SELECT ON public.pundit_specs TO anon, authenticated;
GRANT ALL ON public.pundit_specs TO service_role;
ALTER TABLE public.pundit_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active pundit specs are public" ON public.pundit_specs
  FOR SELECT TO anon, authenticated USING (status = 'active');

CREATE TABLE public.pundit_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES public.daily_drops(id) ON DELETE CASCADE,
  pundit_id TEXT NOT NULL,
  spec_version INT NOT NULL,
  thesis JSONB NOT NULL,
  beat_outline JSONB NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_script TEXT NOT NULL,
  spoken_script TEXT NOT NULL,
  performance_plan JSONB NOT NULL,
  voice_candidate_id UUID,
  audio_url TEXT,
  audio_bytes BIGINT,
  audio_duration_sec INT,
  audio_storage_path TEXT,
  share_image_url TEXT,
  share_storage_path TEXT,
  transcript TEXT,
  script_identity_verified BOOLEAN NOT NULL DEFAULT false,
  audio_quality JSONB,
  audio_quality_verified_at TIMESTAMPTZ,
  pronunciation_rate NUMERIC CHECK (
    pronunciation_rate IS NULL OR (pronunciation_rate >= 0 AND pronunciation_rate <= 1)
  ),
  tts_model TEXT,
  tts_voice_id TEXT,
  tts_seed BIGINT,
  harness_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','evaluating','repairing','approved','published','quarantined','failed')),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (pundit_id, spec_version) REFERENCES public.pundit_specs(pundit_id, version),
  UNIQUE (drop_id, pundit_id),
  CHECK (status <> 'published' OR (
    published_at IS NOT NULL AND
    audio_url IS NOT NULL AND
    audio_bytes > 0 AND
    audio_duration_sec > 0 AND
    share_image_url IS NOT NULL AND
    transcript IS NOT NULL AND
    script_identity_verified AND
    audio_quality_verified_at IS NOT NULL AND
    COALESCE((audio_quality->>'passed')::boolean, false)
  ))
);
CREATE INDEX pundit_variants_public_idx ON public.pundit_variants(pundit_id, published_at DESC);
GRANT SELECT ON public.pundit_variants TO anon, authenticated;
GRANT ALL ON public.pundit_variants TO service_role;
ALTER TABLE public.pundit_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published pundit variants are public" ON public.pundit_variants
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE TRIGGER pundit_variants_updated_at BEFORE UPDATE ON public.pundit_variants
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.harness_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.pundit_variants(id) ON DELETE CASCADE,
  harness_name TEXT NOT NULL,
  harness_version TEXT NOT NULL,
  model TEXT NOT NULL,
  hard_gate BOOLEAN NOT NULL DEFAULT false,
  attempt INT NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  score NUMERIC CHECK (score IS NULL OR (score >= 1 AND score <= 5)),
  evidence_span TEXT,
  failure TEXT,
  requested_repair TEXT,
  result JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variant_id, harness_name, harness_version, attempt)
);
CREATE INDEX harness_runs_variant_idx ON public.harness_runs(variant_id, attempt, harness_name);
GRANT ALL ON public.harness_runs TO service_role;
ALTER TABLE public.harness_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.prediction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID REFERENCES public.daily_drops(id) ON DELETE SET NULL,
  pundit_id TEXT NOT NULL CHECK (pundit_id IN ('zen','gaffer','stats','romantic','doomer','banter')),
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  kickoff_at TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL,
  shared_probabilities JSONB NOT NULL,
  pundit_probabilities JSONB NOT NULL,
  thesis TEXT NOT NULL,
  measurable_advantage TEXT NOT NULL,
  indicator TEXT NOT NULL,
  expected_turning_point TEXT NOT NULL,
  evidence_refs TEXT[] NOT NULL,
  adjustment_evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  falsifier TEXT NOT NULL,
  evaluation_rule JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','correct','partly_correct','wrong','unjudgeable')),
  settlement JSONB,
  brier_score NUMERIC,
  log_loss NUMERIC,
  receipt TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pundit_id, match_id),
  CHECK (locked_at <= kickoff_at),
  CHECK (cardinality(evidence_refs) > 0),
  CHECK (status = 'open' OR settled_at IS NOT NULL)
);
CREATE INDEX prediction_ledger_public_idx ON public.prediction_ledger(pundit_id, kickoff_at DESC);
GRANT SELECT ON public.prediction_ledger TO anon, authenticated;
GRANT ALL ON public.prediction_ledger TO service_role;
ALTER TABLE public.prediction_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locked predictions and receipts are public" ON public.prediction_ledger
  FOR SELECT TO anon, authenticated USING (locked_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.protect_prediction_registration()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.kickoff_at <= now() THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'prediction registration is immutable after kickoff';
    END IF;
    IF NEW.drop_id IS DISTINCT FROM OLD.drop_id OR
       NEW.pundit_id IS DISTINCT FROM OLD.pundit_id OR
       NEW.match_id IS DISTINCT FROM OLD.match_id OR
       NEW.kickoff_at IS DISTINCT FROM OLD.kickoff_at OR
       NEW.locked_at IS DISTINCT FROM OLD.locked_at OR
       NEW.shared_probabilities IS DISTINCT FROM OLD.shared_probabilities OR
       NEW.pundit_probabilities IS DISTINCT FROM OLD.pundit_probabilities OR
       NEW.thesis IS DISTINCT FROM OLD.thesis OR
       NEW.measurable_advantage IS DISTINCT FROM OLD.measurable_advantage OR
       NEW.indicator IS DISTINCT FROM OLD.indicator OR
       NEW.expected_turning_point IS DISTINCT FROM OLD.expected_turning_point OR
       NEW.evidence_refs IS DISTINCT FROM OLD.evidence_refs OR
       NEW.adjustment_evidence_refs IS DISTINCT FROM OLD.adjustment_evidence_refs OR
       NEW.falsifier IS DISTINCT FROM OLD.falsifier OR
       NEW.evaluation_rule IS DISTINCT FROM OLD.evaluation_rule THEN
      RAISE EXCEPTION 'prediction registration is immutable after kickoff';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION public.protect_prediction_registration() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prediction_registration_immutable
  BEFORE UPDATE OR DELETE ON public.prediction_ledger
  FOR EACH ROW EXECUTE FUNCTION public.protect_prediction_registration();

CREATE TABLE public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator TEXT NOT NULL,
  channel TEXT NOT NULL,
  source_urls TEXT[] NOT NULL,
  permission_basis TEXT NOT NULL,
  permitted_uses TEXT[] NOT NULL,
  attribution_requirements TEXT,
  quotation_policy TEXT NOT NULL CHECK (quotation_policy IN ('quotation','paraphrase','concepts_only')),
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('candidate','approved','expired','rejected','quarantined')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.research_sources TO service_role;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.concept_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ids UUID[] NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'analytical_technique','evidence_pattern','explanation_method','outcome_separation',
    'prediction_structure','humour_mechanism','analytical_failure'
  )),
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  citations JSONB NOT NULL,
  overlap_score NUMERIC CHECK (overlap_score IS NULL OR (overlap_score >= 0 AND overlap_score <= 1)),
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','accepted','rejected','quarantined')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(source_ids) > 0)
);
GRANT ALL ON public.concept_cards TO service_role;
ALTER TABLE public.concept_cards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pronunciation_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('club','competition','manager','player','place')),
  entity_id TEXT,
  display_text TEXT NOT NULL,
  phonetic_rendering TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL,
  verification_state TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified','machine_verified','human_verified','rejected')),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (display_text, language)
);
GRANT ALL ON public.pronunciation_lexicon TO service_role;
ALTER TABLE public.pronunciation_lexicon ENABLE ROW LEVEL SECURITY;

-- Version-one public contracts. The full executable definitions live in
-- src/lib/pundit/specs.ts; these rows make the FK and public discovery path
-- usable immediately after migration.
WITH shared AS (
  SELECT
    '{"tacticalStructure":40,"probabilityDecisionQuality":20,"journalismContext":15,"storyBroadcasting":15,"provocation":10}'::jsonb AS weights,
    '{"insight":4,"clarity":4,"judgment":4,"outcome_separation":4,"probability":4,"independence":4,"story":4,"persona":4,"humour":3,"memorability":4,"restraint":4,"prediction_accountability":4}'::jsonb AS thresholds
), specs(pundit_id, name, lens, evidence_preferences, humour_profile, language_profile, prediction_profile, performance_profile) AS (
  VALUES
    ('zen', 'The Reporter', 'Balanced evidence and news judgment', '["score progression","game state","xG","material events"]'::jsonb, '{"mechanisms":["dry observation","understatement"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"composed setup, brisk evidence, short verdict"}'::jsonb, '{"risk":"low","style":"calibrated and specific"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_REPORTER","pace":"measured","energy":3}'::jsonb),
    ('gaffer', 'The Gaffer', 'Decisions, substitutions, game state and counterfactuals', '["substitution timing","score state","cards","event sequence"]'::jsonb, '{"mechanisms":["workplace absurdity","experienced exasperation"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"clipped judgment, pause, reason"}'::jsonb, '{"risk":"measured","style":"decision and measurable consequence"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_GAFFER","pace":"brisk","energy":3}'::jsonb),
    ('stats', 'The Numbers Guy', 'Probability, xG, variance and process versus outcome', '["xG","shots","conversion","sample size","calibration"]'::jsonb, '{"mechanisms":["statistical incongruity","self-aware nerd humour"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"energetic explanation, slower numerical conclusion"}'::jsonb, '{"risk":"measured","style":"calibrated probabilities"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_NUMBERS","pace":"brisk","energy":4}'::jsonb),
    ('romantic', 'The Romantic', 'Narrative turns, extraordinary actions and emotional stakes', '["late goals","score reversals","rare event sequences"]'::jsonb, '{"mechanisms":["poetic incongruity","affectionate absurdity"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"warm setup with space around exceptional moments"}'::jsonb, '{"risk":"measured","style":"measurable story turn"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_ROMANTIC","pace":"measured","energy":4}'::jsonb),
    ('doomer', 'The Doomer', 'Failure modes, fragility, downside scenarios and warning signs', '["chances conceded","late deterioration","cards","negative variance"]'::jsonb, '{"mechanisms":["gallows humour","controlled escalation"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"quiet setup, controlled escalation"}'::jsonb, '{"risk":"high","style":"measurable downside path"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_DOOMER","pace":"slow","energy":3}'::jsonb),
    ('banter', 'The Wind-Up', 'Rivalry, contradiction, status and bold judgments', '["public claim versus result","rival comparison","receipts"]'::jsonb, '{"mechanisms":["tribal teasing","status reversal"],"prohibited":["personal humiliation","injury","grief"]}'::jsonb, '{"cadence":"fast, pause before sting, return to evidence"}'::jsonb, '{"risk":"high","style":"bold and easy to quote back"}'::jsonb, '{"voiceEnv":"ELEVENLABS_VOICE_WINDUP","pace":"brisk","energy":5}'::jsonb)
)
INSERT INTO public.pundit_specs (
  pundit_id, version, name, doctrine, analytical_weights, evidence_preferences,
  humour_profile, language_profile, prediction_profile, performance_profile,
  required_thresholds, examples, anti_examples, status
)
SELECT
  specs.pundit_id,
  1,
  specs.name,
  jsonb_build_object(
    'lens', specs.lens,
    'facts', 'closed-world',
    'interpretations', 'strong opinions, weakly held',
    'prohibitedImitation', 'living pundits'
  ),
  shared.weights,
  specs.evidence_preferences,
  specs.humour_profile,
  specs.language_profile,
  specs.prediction_profile,
  specs.performance_profile,
  shared.thresholds,
  '[]'::jsonb,
  '[]'::jsonb,
  'active'
FROM specs CROSS JOIN shared
ON CONFLICT (pundit_id, version) DO NOTHING;
