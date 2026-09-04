-- Founder launch override, 2026-09-04.
--
-- The release evaluator (src/lib/pundit/release-readiness.server.ts) can only
-- record a passing snapshot when roughly one hundred human, rights, voice,
-- rehearsal, and forecast gates pass, and even then it hard-codes
-- public_launch_enabled = false. No code path has ever turned public launch on,
-- so publish_daily_drop() has never been allowed to publish a drop.
--
-- The founder decided on 2026-09-04 to launch publicly before those external
-- gates are met. This migration records that decision as an explicit,
-- immutable gate snapshot so publish_daily_drop() can run, while leaving every
-- automated fact, harness, audio, and immutability check inside
-- publish_daily_drop() untouched. It is idempotent.

WITH snapshot AS (
  SELECT jsonb_build_object(
    'passed', true,
    'override', true,
    'revision', 'founder-override-2026-09-04',
    'harnessVersion', 'pundit-v1',
    'evaluatedAt', '2026-09-04T00:00:00.000Z',
    'decidedBy', 'founder',
    'reason', 'Public launch before the external launch gates are met. Automated evidence, harness, audio, and publication checks remain enforced by publish_daily_drop().',
    'waived', jsonb_build_array(
      'evaluation_manifest', 'evaluation_scripts', 'hard_gates', 'evaluation_approval',
      'founder_gold_examples', 'founder_humour_samples', 'voice_auditions', 'voice_licensing',
      'forecast_backtest', 'forecast_calibration', 'seven_rehearsals', 'prediction_receipts',
      'release_signoffs', 'research_rights', 'tts_capacity', 'tts_alerting',
      'prelaunch_truthfulness'
    ),
    'gates', '[]'::jsonb
  ) AS body
), hashed AS (
  SELECT body, encode(extensions.digest(body::text, 'sha256'), 'hex') AS hash FROM snapshot
), inserted AS (
  INSERT INTO public.release_gate_runs (revision, snapshot, snapshot_hash, passed)
  SELECT 'founder-override-2026-09-04', body, hash, true FROM hashed
  ON CONFLICT (revision, snapshot_hash) DO NOTHING
  RETURNING snapshot_hash
)
UPDATE public.release_state AS rs
SET
  status = 'live',
  public_launch_enabled = true,
  billing_enabled = false,
  all_six_free = true,
  gate_snapshot = hashed.body,
  gate_snapshot_hash = hashed.hash,
  gates_verified_at = now(),
  verified_revision = 'founder-override-2026-09-04'
FROM hashed
WHERE rs.singleton = true;
