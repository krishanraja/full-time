-- Evaluate auth.uid() once per statement instead of once per candidate row.

DROP POLICY IF EXISTS "Profiles self read" ON public.profiles;
CREATE POLICY "Profiles self read" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles self upsert" ON public.profiles;
CREATE POLICY "Profiles self upsert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
CREATE POLICY "Profiles self update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Follows self" ON public.follows;
CREATE POLICY "Follows self" ON public.follows
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Push self" ON public.push_subscriptions;
CREATE POLICY "Push self" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Listens self read" ON public.listens;
CREATE POLICY "Listens self read" ON public.listens
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Listens insert auth" ON public.listens;
CREATE POLICY "Listens insert auth" ON public.listens
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Waitlist self insert" ON public.waitlist;
CREATE POLICY "Waitlist self insert" ON public.waitlist
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Waitlist self read" ON public.waitlist;
CREATE POLICY "Waitlist self read" ON public.waitlist
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
