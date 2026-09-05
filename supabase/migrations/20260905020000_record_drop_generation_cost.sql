-- What a drop cost to generate, in US dollars of model spend.
--
-- The product sells generation: a featured match is produced daily, and any
-- other match is produced when someone pays to unlock it. That only works if
-- the cost of the thing being sold is known per drop rather than inferred from
-- a monthly invoice, so the figure is recorded where the drop is.
--
-- Model spend only. It does not include narration, storage or bandwidth.

ALTER TABLE public.daily_drops
  ADD COLUMN IF NOT EXISTS generation_cost_usd NUMERIC(10, 4);

COMMENT ON COLUMN public.daily_drops.generation_cost_usd IS
  'US dollars of model spend to generate this drop''s six variants, summed across the per-pundit steps. Excludes narration and storage.';
