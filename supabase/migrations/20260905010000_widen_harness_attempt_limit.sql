-- A drop publishes only when all six variants pass at once, so the odds of a
-- show are the odds of one variant converging raised to the sixth power. Three
-- repair rounds was the binding constraint, and the generator now allows up to
-- ten (six by default, via PUNDIT_MAX_ATTEMPTS).
--
-- The attempt column still has to be a small, bounded round counter: this
-- widens the ceiling to match the generator's own cap rather than removing it.

ALTER TABLE public.harness_runs
  DROP CONSTRAINT IF EXISTS harness_runs_attempt_check;

ALTER TABLE public.harness_runs
  ADD CONSTRAINT harness_runs_attempt_check CHECK (attempt >= 1 AND attempt <= 10);
