
-- ============ LEAGUES ============
CREATE TABLE public.leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leagues TO anon, authenticated;
GRANT ALL ON public.leagues TO service_role;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leagues are public" ON public.leagues FOR SELECT TO anon, authenticated USING (true);

-- ============ TEAMS ============
CREATE TABLE public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  league_id TEXT NOT NULL REFERENCES public.leagues(id) ON DELETE RESTRICT,
  color TEXT NOT NULL DEFAULT '#888888',
  crest_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are public" ON public.teams FOR SELECT TO anon, authenticated USING (true);

-- ============ MATCHES ============
CREATE TABLE public.matches (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES public.leagues(id),
  home_team_id TEXT NOT NULL REFERENCES public.teams(id),
  away_team_id TEXT NOT NULL REFERENCES public.teams(id),
  home_score INT,
  away_score INT,
  kickoff_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | finished
  importance_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX matches_kickoff_idx ON public.matches(kickoff_at DESC);
CREATE INDEX matches_status_idx ON public.matches(status);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are public" ON public.matches FOR SELECT TO anon, authenticated USING (true);

-- ============ EPISODES ============
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voice_style TEXT NOT NULL DEFAULT 'analyst',
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  duration_sec INT NOT NULL DEFAULT 90,
  badge TEXT, -- BIGGEST MOMENT | LATE DRAMA | DEMOLITION | CLASSIC
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX episodes_published_idx ON public.episodes(published_at DESC);
CREATE INDEX episodes_match_idx ON public.episodes(match_id);
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Episodes are public" ON public.episodes FOR SELECT TO anon, authenticated USING (true);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  voice_style_pref TEXT NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team','league')),
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows self" ON public.follows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PUSH SUBSCRIPTIONS ============
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Push self" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ LISTENS ============
CREATE TABLE public.listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listens_episode_idx ON public.listens(episode_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listens TO authenticated;
GRANT INSERT ON public.listens TO anon;
GRANT ALL ON public.listens TO service_role;
ALTER TABLE public.listens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listens self read" ON public.listens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Listens insert auth" ON public.listens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Listens insert anon" ON public.listens FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;

-- ============ SEED DATA ============
INSERT INTO public.leagues (id, name, country) VALUES
  ('epl', 'Premier League', 'England'),
  ('laliga', 'La Liga', 'Spain'),
  ('seriea', 'Serie A', 'Italy'),
  ('ligue1', 'Ligue 1', 'France'),
  ('bundesliga', 'Bundesliga', 'Germany');

INSERT INTO public.teams (id, name, short, league_id, color) VALUES
  ('ars', 'Arsenal', 'ARS', 'epl', '#EF0107'),
  ('liv', 'Liverpool', 'LIV', 'epl', '#C8102E'),
  ('mci', 'Man City', 'MCI', 'epl', '#6CABDD'),
  ('che', 'Chelsea', 'CHE', 'epl', '#034694'),
  ('bar', 'Barcelona', 'BAR', 'laliga', '#A50044'),
  ('sev', 'Sevilla', 'SEV', 'laliga', '#D5071E'),
  ('rma', 'Real Madrid', 'RMA', 'laliga', '#FEBE10'),
  ('atm', 'Atlético', 'ATM', 'laliga', '#CB3524'),
  ('int', 'Inter', 'INT', 'seriea', '#0066B3'),
  ('juv', 'Juventus', 'JUV', 'seriea', '#111111'),
  ('nap', 'Napoli', 'NAP', 'seriea', '#12A0D7'),
  ('rom', 'Roma', 'ROM', 'seriea', '#8E1F2F'),
  ('psg', 'PSG', 'PSG', 'ligue1', '#004170'),
  ('lyo', 'Lyon', 'LYO', 'ligue1', '#003399'),
  ('bay', 'Bayern', 'BAY', 'bundesliga', '#DC052D'),
  ('bvb', 'Dortmund', 'BVB', 'bundesliga', '#FDE100');

-- Seed yesterday's matches
INSERT INTO public.matches (id, league_id, home_team_id, away_team_id, home_score, away_score, kickoff_at, status, importance_score) VALUES
  ('m_ars_liv', 'epl', 'ars', 'liv', 2, 1, now() - interval '1 day', 'finished', 9.2),
  ('m_bar_sev', 'laliga', 'bar', 'sev', 3, 0, now() - interval '1 day', 'finished', 6.4),
  ('m_int_juv', 'seriea', 'int', 'juv', 1, 1, now() - interval '1 day', 'finished', 8.1),
  ('m_psg_lyo', 'ligue1', 'psg', 'lyo', 4, 2, now() - interval '1 day', 'finished', 7.0),
  ('m_bay_bvb', 'bundesliga', 'bay', 'bvb', 5, 1, now() - interval '1 day', 'finished', 8.6);

-- Tonight's fixtures
INSERT INTO public.matches (id, league_id, home_team_id, away_team_id, kickoff_at, status, importance_score) VALUES
  ('m_rma_atm', 'laliga', 'rma', 'atm', (current_date + time '21:00')::timestamptz, 'scheduled', 9.0),
  ('m_che_mci', 'epl', 'che', 'mci', (current_date + time '21:00')::timestamptz, 'scheduled', 8.5),
  ('m_nap_rom', 'seriea', 'nap', 'rom', (current_date + time '20:45')::timestamptz, 'scheduled', 7.2);

-- Seed episodes
INSERT INTO public.episodes (match_id, title, hook, script, duration_sec, badge) VALUES
  ('m_ars_liv', 'Arsenal steal it late',
   'Ninety-two minutes of grit, then a header out of nowhere. North London exhales.',
   'Ninety-two minutes. That is how long Arsenal waited for the moment. Liverpool had matched them blow for blow, the visitors looking the more likely after the hour. Then the corner, the flick, the header — and the Emirates erupts. Two-one. A win that says more about belief than about football.',
   95, 'BIGGEST MOMENT'),
  ('m_bar_sev', 'Barcelona turn the screw',
   'Patient, then ruthless. Three goals inside twenty minutes and Sevilla stopped resisting.',
   'For an hour, Sevilla held. Then Barcelona found a gear nobody else has. Three goals in twenty minutes, each one cleaner than the last. By the end, the away end was applauding the opposition. Three-nil, and the table reshapes overnight.',
   78, NULL),
  ('m_int_juv', 'Derby d''Italia ends level',
   'Two heavyweights, two punches, no winner. The title race tightens by a millimetre.',
   'A San Siro humming, a Juventus side refusing to flinch. They traded goals inside the first half hour, then spent sixty minutes circling. One-one. Neither manager smiled. Neither could afford to.',
   88, 'CLASSIC'),
  ('m_psg_lyo', 'PSG outscore Lyon in a thriller',
   'Six goals, two red cards'' worth of tension, and Paris just had more in the tank.',
   'Lyon came to Paris and refused to sit. They scored twice. The problem: PSG scored four. A wild, open, unprofessional ninety minutes that nobody who watched it will forget. Four-two.',
   102, 'LATE DRAMA'),
  ('m_bay_bvb', 'Der Klassiker becomes a demolition',
   'Bayern were rude. Dortmund were tourists. Five-one barely tells the story.',
   'Some games are over by twenty minutes. This was one. Bayern pressed, Dortmund panicked, and the Allianz Arena did the rest. Five-one on the board, and it could have been more. A statement, delivered loudly.',
   110, 'DEMOLITION');
