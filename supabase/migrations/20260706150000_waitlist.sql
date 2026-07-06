-- ============================================================
-- Full Time: waitlist for the full app (live daily drops).
-- docs/15-access-and-waitlist-plan.md. Additive, idempotent.
-- A waitlist member IS a free account: user_id is the identity,
-- there is no separate email list. Position is computed from
-- joined_at ordering by a service_role read (getWaitlistStatus),
-- so user RLS stays own-row-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT,                -- where the join came from: waitlist_page | settings | today | auth_redirect
  referral_code TEXT UNIQUE,       -- this member's own share code (phase 3.5, unused for now)
  referred_by TEXT,                -- the referral_code that brought them (phase 3.5)
  invited_at  TIMESTAMPTZ,         -- set by ops when a launch cohort is admitted
  cohort      TEXT                 -- launch cohort label, set by ops
);

CREATE INDEX IF NOT EXISTS waitlist_joined_at_idx ON public.waitlist(joined_at);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.waitlist TO authenticated;

-- A signed-in user may join once (own row) and see their own row.
-- invited_at / cohort are ops-only: the guard trigger below keeps
-- user inserts honest, and there is no UPDATE grant at all.
DROP POLICY IF EXISTS "Waitlist self insert" ON public.waitlist;
CREATE POLICY "Waitlist self insert" ON public.waitlist
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Waitlist self read" ON public.waitlist;
CREATE POLICY "Waitlist self read" ON public.waitlist
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Guard: a user joining cannot backdate joined_at or set ops fields.
CREATE OR REPLACE FUNCTION public.enforce_waitlist_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.joined_at  := now();
    NEW.invited_at := NULL;
    NEW.cohort     := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS waitlist_guard ON public.waitlist;
CREATE TRIGGER waitlist_guard
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.enforce_waitlist_guard();
