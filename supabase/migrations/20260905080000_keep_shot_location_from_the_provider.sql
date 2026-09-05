-- Where the shots came from, which is the shot quality signal we already pay for.
--
-- Expected goals left the provider's payload on 1 September and the judges have
-- been rejecting scripts ever since for exactly the reason it caused: a pundit
-- cannot separate fourteen speculative efforts from fourteen real chances, so
-- it hedges, and hedging fails the probability and insight dimensions.
--
-- The same payload has always carried "Shots insidebox" and "Shots outsidebox"
-- and we stored neither. It is not expected goals, and it must never be
-- described as such, but it is a defensible measure of where a side was
-- shooting from, from the feed we already have.
ALTER TABLE public.match_stats
  ADD COLUMN IF NOT EXISTS home_shots_inside_box INTEGER,
  ADD COLUMN IF NOT EXISTS away_shots_inside_box INTEGER,
  ADD COLUMN IF NOT EXISTS home_shots_outside_box INTEGER,
  ADD COLUMN IF NOT EXISTS away_shots_outside_box INTEGER;
