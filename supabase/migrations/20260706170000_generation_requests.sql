-- ============================================================
-- Full Time: name-a-game on-demand generation ledger.
-- docs/15-access-and-waitlist-plan.md Phase 2. Additive, idempotent.
-- Server-side only: requests are written and read exclusively by the
-- requestEpisode server fn under service_role. It is the rate-limit
-- source of truth (3 generations per user per UTC day), so users get
-- NO grants at all: nothing to bypass client-side.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generation_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  episode_id  UUID,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_requests_user_day_idx
  ON public.generation_requests(user_id, created_at);

ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
-- Deliberately no GRANT and no policies for authenticated/anon.
