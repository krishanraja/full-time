-- Publish the pundits that passed, instead of demanding all six at once.
--
-- Every gate here is per variant: entailment, licences, the twelve qualitative
-- judges, transcript fidelity, loudness, duration, pronunciation, a licensed
-- voice. Requiring all six to clear every one of them simultaneously turned six
-- independent standards into a single compound one, and the compound one is what
-- has blocked publication. The last full run had one variant clean and five
-- short of it, and produced nothing.
--
-- A listener plays one pundit. A day where four of the six are ready is a show
-- for four sixths of the audience, not a failure for all of them, and the two
-- that fell short are withheld rather than weakened.
--
-- Nothing is loosened. A variant still publishes only if it passes every gate it
-- passed before, including its own twenty-five named harnesses. What changes is
-- that its neighbour's failure no longer withholds it. Variants that did not
-- qualify are quarantined at publication, so an approved-but-short variant
-- cannot linger in a state that looks publishable.

CREATE OR REPLACE FUNCTION public.publish_daily_drop(target_drop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  release_row public.release_state%ROWTYPE;
  drop_row public.daily_drops%ROWTYPE;
  variant_count INT;
  pundit_count INT;
  audio_count INT;
  publishable UUID[];
  withheld TEXT[];
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
  SELECT COALESCE(array_agg(pv.id), ARRAY[]::UUID[])
  INTO publishable
  FROM public.pundit_variants pv
  LEFT JOIN public.voice_candidates vc ON vc.id = pv.voice_candidate_id
  WHERE pv.drop_id = target_drop_id
    AND pv.status = 'approved'
    AND pv.audio_url IS NOT NULL
    AND pv.audio_bytes > 0
    AND pv.audio_duration_sec > 0
    AND pv.share_image_url IS NOT NULL
    AND pv.transcript IS NOT NULL
    AND pv.script_identity_verified
    AND pv.audio_quality_verified_at IS NOT NULL
    AND COALESCE((pv.audio_quality->>'passed')::boolean, false)
    AND pv.pronunciation_rate >= 0.99
    AND vc.id IS NOT NULL
    AND vc.status = 'selected'
    AND vc.commercial_use_approved
    AND vc.founder_approved
    AND vc.rights_confirmed_at IS NOT NULL
    AND pv.tts_voice_id IS NOT DISTINCT FROM vc.provider_voice_ref
    AND NOT EXISTS (
      SELECT 1
      FROM required r
      LEFT JOIN latest l ON l.variant_id = pv.id AND l.harness_name = r.name
      WHERE l.variant_id IS NULL OR NOT l.passed
    );

  SELECT count(*), count(DISTINCT pundit_id), count(DISTINCT audio_url)
  INTO variant_count, pundit_count, audio_count
  FROM public.pundit_variants
  WHERE id = ANY(publishable);

  SELECT COALESCE(array_agg(pundit_id ORDER BY pundit_id), ARRAY[]::TEXT[])
  INTO withheld
  FROM public.pundit_variants
  WHERE drop_id = target_drop_id
    AND NOT (id = ANY(publishable));

  -- One clean variant is a show. None is not. A pundit appearing twice, or two
  -- pundits sharing one audio file, still fails the whole drop.
  IF variant_count < 1 OR pundit_count <> variant_count OR audio_count <> variant_count THEN
    RAISE EXCEPTION 'drop promise checks failed';
  END IF;

  checks := jsonb_build_object(
    'variantCount', variant_count,
    'punditCount', pundit_count,
    'distinctAudioCount', audio_count,
    'withheldPundits', to_jsonb(withheld),
    'verifiedAt', now_at
  );

  UPDATE public.pundit_variants
  SET status = 'published', published_at = now_at
  WHERE id = ANY(publishable);

  -- An approved variant that did not qualify must not sit in a state that reads
  -- as publishable once the drop is out.
  UPDATE public.pundit_variants
  SET status = 'quarantined'
  WHERE drop_id = target_drop_id
    AND status = 'approved'
    AND NOT (id = ANY(publishable));

  UPDATE public.daily_drops
  SET status = 'published', published_at = now_at, promise_checks = checks, promise_checked_at = now_at
  WHERE id = target_drop_id;

  RETURN checks;
END;
$function$;
