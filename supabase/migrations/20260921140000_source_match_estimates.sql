-- Numbers from models other than the licensed feed's own.
--
-- The evidence pack is built from the database and never from a live call, so
-- that a run is reproducible and closed-world. An estimate has to be ingested
-- like everything else or it cannot be cited, and a claim that cannot cite its
-- evidence is refused before it reaches prose.
--
-- One row per match per source. Not folded into match_stats: that table is the
-- licensed feed's own record, and mixing a model's output into it would undo
-- the distinction this whole change exists to make. The kind of a number and
-- the rights basis of a number are different facts and both are recorded.
--
-- Ruling (Krish, 2026-09-21): ingest the free-to-access analytics tier for
-- production evidence, accepting the rights exposure. rights_basis carries the
-- truth of that per row, and 'unlicensed' is a value this table expects to
-- hold rather than an error state. See docs/11-legal.md.

CREATE TABLE IF NOT EXISTS public.source_match_estimates (
  match_id      TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  source_id     TEXT NOT NULL,          -- the adapter, e.g. 'fotmob'
  model         TEXT NOT NULL,          -- the model, named for the evidence pack
  rights_basis  TEXT NOT NULL
                CHECK (rights_basis IN ('licensed', 'public-domain', 'unlicensed')),
  home_xg       NUMERIC(5, 2),
  away_xg       NUMERIC(5, 2),
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, source_id)
);
CREATE INDEX IF NOT EXISTS source_match_estimates_match_idx
  ON public.source_match_estimates(match_id);
GRANT ALL ON public.source_match_estimates TO service_role;
ALTER TABLE public.source_match_estimates ENABLE ROW LEVEL SECURITY;   -- service_role only

COMMENT ON TABLE public.source_match_estimates IS
  'One row per match per non-feed source. Every number here is a model estimate, never a count, and reaches the evidence pack as kind=estimate with the model named.';
COMMENT ON COLUMN public.source_match_estimates.rights_basis IS
  'The recorded basis for using this source. unlicensed means free to access with no permission granted, which docs/11-legal.md describes in full. Never write a basis the source did not give.';
