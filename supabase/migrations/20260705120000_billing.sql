-- ============================================================
-- Full Time: billing / Pro entitlement (Stripe). Additive, idempotent.
-- Free vs "Full Time Pro" ($4.99/mo). Entitlement lives on profiles;
-- it is written ONLY by the Stripe webhook (service_role). A guard
-- trigger makes the billing columns immutable to authenticated/anon
-- roles, so a user can never self-grant Pro through the existing
-- "Profiles self update" RLS policy.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan                   TEXT NOT NULL DEFAULT 'free'
                                                  CHECK (plan IN ('free','pro')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT,   -- Stripe sub status verbatim
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_id               TEXT;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx     ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_idx ON public.profiles(stripe_subscription_id);

-- Guard: only service_role / superuser may write the billing columns.
-- SECURITY INVOKER (default) => current_user reflects the real caller role
-- ('authenticated' or 'anon' for PostgREST user requests, 'service_role'
-- for the webhook's admin client).
CREATE OR REPLACE FUNCTION public.enforce_profile_billing_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plan                   := 'free';
      NEW.subscription_status    := NULL;
      NEW.stripe_customer_id     := NULL;
      NEW.stripe_subscription_id := NULL;
      NEW.current_period_end     := NULL;
      NEW.price_id               := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.plan                   := OLD.plan;
      NEW.subscription_status    := OLD.subscription_status;
      NEW.stripe_customer_id     := OLD.stripe_customer_id;
      NEW.stripe_subscription_id := OLD.stripe_subscription_id;
      NEW.current_period_end     := OLD.current_period_end;
      NEW.price_id               := OLD.price_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_billing_guard ON public.profiles;
CREATE TRIGGER profiles_billing_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_billing_guard();
