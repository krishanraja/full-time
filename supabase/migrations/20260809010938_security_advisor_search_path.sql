-- Pin trigger-function resolution to the intended application schema.
ALTER FUNCTION public.enforce_profile_billing_guard() SET search_path = public;
ALTER FUNCTION public.enforce_waitlist_guard() SET search_path = public;
