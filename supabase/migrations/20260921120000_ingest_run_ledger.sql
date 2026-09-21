-- What the provider sent, and what it stopped sending.
--
-- Expected goals arrived for every match up to 31 August 2026 and for none
-- after it, while shots, possession and corners kept coming. Nothing raised
-- for five days, and the reason is that nothing about an ingest run outlives
-- the run. The warnings are a local array in the route, returned in an HTTP
-- response body that nobody reads, and the cron fires at 00:15 UTC. The only
-- record was Vercel log retention.
--
-- Two tables, both service-role only, neither read by the editorial pipeline.
-- This is observability. A failure to write it must never fail an ingest.

-- ---------- INGEST RUNS: one row per run, so a run can be compared to the last ----------
CREATE TABLE IF NOT EXISTS public.ingest_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_date  DATE NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished       INT NOT NULL DEFAULT 0,   -- fixtures with status FT
  enriched       INT NOT NULL DEFAULT 0,   -- fixtures that got events, stats and lineups
  calls          INT NOT NULL DEFAULT 0,   -- provider requests spent
  warnings       JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT ingest_runs_coverage_date_uniq UNIQUE (coverage_date, started_at)
);
CREATE INDEX IF NOT EXISTS ingest_runs_date_idx
  ON public.ingest_runs(coverage_date DESC, started_at DESC);
GRANT ALL ON public.ingest_runs TO service_role;
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;   -- service_role only, no public policy

COMMENT ON TABLE public.ingest_runs IS
  'One row per ingest run. Observability only: never read by the editorial pipeline, and a failed write must not fail a run.';

-- ---------- PROVIDER STAT PRESENCE: one row per statistic per day ----------
--
-- Not per fixture. A field the provider drops is dropped for every fixture that
-- day, so per-fixture rows would be twelve times the volume and carry nothing
-- extra. Eleven rows a day is enough to answer the only question that matters:
-- was this arriving yesterday, and is it arriving now.
--
-- provider_labels holds the labels the provider actually sent, in its own
-- words, which is what tells a rename apart from a withdrawal. Those have
-- opposite fixes: a rename is one string, a withdrawal means the evidence pack
-- has to stop depending on the figure.
CREATE TABLE IF NOT EXISTS public.provider_stat_presence (
  coverage_date     DATE NOT NULL,
  stat_key          TEXT NOT NULL,   -- the column it is stored in, e.g. 'xg'
  provider_label    TEXT NOT NULL,   -- the label we ask for, e.g. 'expected_goals'
  fixtures_seen     INT NOT NULL DEFAULT 0,
  fixtures_present  INT NOT NULL DEFAULT 0,
  provider_labels   TEXT[] NOT NULL DEFAULT '{}',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (coverage_date, stat_key)
);
CREATE INDEX IF NOT EXISTS provider_stat_presence_date_idx
  ON public.provider_stat_presence(coverage_date DESC);
GRANT ALL ON public.provider_stat_presence TO service_role;
ALTER TABLE public.provider_stat_presence ENABLE ROW LEVEL SECURITY;   -- service_role only

COMMENT ON TABLE public.provider_stat_presence IS
  'One row per tracked statistic per coverage date: how many fixtures carried it, and every label the provider sent that day. Observability only.';
COMMENT ON COLUMN public.provider_stat_presence.provider_labels IS
  'Labels the provider sent, in its own words. An absent statistic beside an unrecognised label is a rename; beside only recognised labels it is a withdrawal.';

-- ---------- STANDINGS SNAPSHOTS: a unique constraint that could never collide ----------
--
-- The table has existed since 2026-08-06 and nothing has ever written to it, so
-- this has never been exercised. UNIQUE (league_id, season, captured_at) with
-- captured_at DEFAULT now() cannot collide: two runs on one day write two
-- snapshots and the reader has to arbitrate. One snapshot per league per day is
-- the intent, and the provider recommends one call a day, so say that.
--
-- source records where the row came from. The rights posture requires a
-- recorded basis for every piece of data the product uses, and provenance in
-- the row is the cheapest durable form of that record.
ALTER TABLE public.standings_snapshots
  ADD COLUMN IF NOT EXISTS captured_on DATE
    GENERATED ALWAYS AS ((captured_at AT TIME ZONE 'UTC')::date) STORED;
ALTER TABLE public.standings_snapshots
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'api-football';

ALTER TABLE public.standings_snapshots
  DROP CONSTRAINT IF EXISTS standings_snapshot_uniq;
ALTER TABLE public.standings_snapshots
  ADD CONSTRAINT standings_snapshot_daily_uniq UNIQUE (league_id, season, captured_on);

COMMENT ON COLUMN public.standings_snapshots.captured_on IS
  'The UTC date of captured_at. One snapshot per league per season per day; the previous unique constraint included the timestamp and could never collide.';
COMMENT ON COLUMN public.standings_snapshots.source IS
  'Where this snapshot came from. Every row carries its own provenance because the rights posture requires a recorded basis per source.';
