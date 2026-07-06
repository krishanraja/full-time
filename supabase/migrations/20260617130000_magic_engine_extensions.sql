-- ============================================================
-- Full Time: Magic Engine extensions
-- Adds the data the voice + intelligence-synthesis + accuracy
-- floor + per-timezone + Full Time Live (Phase 2) all need.
-- Additive only. Safe on the seeded base schema.
-- ============================================================

-- ---------- PLAYERS (grounding for scorers / career tallies) ----------
CREATE TABLE public.players (
  id          TEXT PRIMARY KEY,                 -- provider player id
  name        TEXT NOT NULL,
  team_id     TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon, authenticated;
GRANT ALL    ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players are public" ON public.players FOR SELECT TO anon, authenticated USING (true);

-- ---------- MATCH EVENTS (the factual record the narration is grounded against) ----------
CREATE TABLE public.match_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute            INT,                          -- 0..130
  added_time        INT,
  type              TEXT NOT NULL CHECK (type IN (
                       'goal','own_goal','penalty_goal','penalty_miss',
                       'yellow','red','second_yellow','sub','var')),
  team_id           TEXT REFERENCES public.teams(id),
  player_id         TEXT REFERENCES public.players(id),
  player_name       TEXT,                         -- denormalized provider name (when not in players)
  assist_player_id  TEXT REFERENCES public.players(id),
  detail            TEXT,                         -- freeform provider detail
  source            TEXT,                         -- which feed produced it
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX match_events_match_idx ON public.match_events(match_id);
CREATE INDEX match_events_type_idx  ON public.match_events(type);
GRANT SELECT ON public.match_events TO anon, authenticated;
GRANT ALL    ON public.match_events TO service_role;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match events are public" ON public.match_events FOR SELECT TO anon, authenticated USING (true);

-- ---------- MATCH STATS (xG / possession / shots, the synthesis fuel) ----------
CREATE TABLE public.match_stats (
  match_id        TEXT PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  home_xg         NUMERIC,
  away_xg         NUMERIC,
  home_possession INT,
  away_possession INT,
  home_shots      INT,
  away_shots      INT,
  home_sot        INT,                            -- shots on target
  away_sot        INT,
  home_corners    INT,
  away_corners    INT,
  source          TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_stats TO anon, authenticated;
GRANT ALL    ON public.match_stats TO service_role;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match stats are public" ON public.match_stats FOR SELECT TO anon, authenticated USING (true);

-- ---------- EPISODES: 4-segment shape, magic sentence, share assets, verification, locale ----------
ALTER TABLE public.episodes
  ADD COLUMN segments       JSONB,                -- [{seg:'lede'|'story'|'magic'|'forward', text, start_sec, end_sec}]
  ADD COLUMN magic_sentence TEXT,                 -- the 30-50s line; source for the auto-cut clip
  ADD COLUMN forward_line   TEXT,
  ADD COLUMN share_clip_url TEXT,                 -- 15s magic-sentence audiogram
  ADD COLUMN og_image_url   TEXT,                 -- scoreline OG card
  ADD COLUMN locale         TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN model          TEXT,                 -- llm/tts provenance
  ADD COLUMN verification   JSONB,                -- {score_ok, grounded, feeds_agree, checks:[...]}
  ADD COLUMN status         TEXT NOT NULL DEFAULT 'published'
                            CHECK (status IN ('draft','verifying','published','held','failed'));
-- Transactional idempotency: one episode per match per locale (per voice for now = single voice).
ALTER TABLE public.episodes ADD CONSTRAINT episodes_match_locale_uniq UNIQUE (match_id, locale);

-- ---------- SYNTHESIS INSIGHTS (the curated-first morning coda) ----------
CREATE TABLE public.synthesis_insights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_date        DATE NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN (
                     'cross_league_simultaneity','streak','drought',
                     'historical_rarity','set_piece','milestone','coincidence')),
  text             TEXT NOT NULL,                 -- the phrased coda line (LLM phrases an engine-proven fact)
  computed_payload JSONB NOT NULL,                -- deterministic evidence proving it true
  surprise_score   NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','shipped','rejected')),
  audio_url        TEXT,
  card_image_url   TEXT,
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX synthesis_drop_idx ON public.synthesis_insights(drop_date DESC);
GRANT SELECT ON public.synthesis_insights TO anon, authenticated;
GRANT ALL    ON public.synthesis_insights TO service_role;
ALTER TABLE public.synthesis_insights ENABLE ROW LEVEL SECURITY;
-- Public can only ever read a SHIPPED coda; pending/approved/rejected stay internal.
CREATE POLICY "Synthesis shipped public" ON public.synthesis_insights
  FOR SELECT TO anon, authenticated USING (status = 'shipped');
CREATE TRIGGER synthesis_updated_at BEFORE UPDATE ON public.synthesis_insights
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- VOICE CORPUS (founder-editable; feeds generation; never public) ----------
CREATE TABLE public.voice_corpus (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL CHECK (kind IN (
                'style_rule','do','dont','example','red_example',
                'per_match_type','banned_term','motif','anti_tone')),
  match_type  TEXT,                               -- for per_match_type entries
  content     TEXT NOT NULL,
  weight      NUMERIC NOT NULL DEFAULT 1,
  active      BOOLEAN NOT NULL DEFAULT true,
  version     INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_corpus_kind_idx ON public.voice_corpus(kind) WHERE active;
GRANT ALL ON public.voice_corpus TO service_role;          -- managed server-side / admin only
ALTER TABLE public.voice_corpus ENABLE ROW LEVEL SECURITY;  -- no anon/authenticated policy = locked to service_role
CREATE TRIGGER voice_corpus_updated_at BEFORE UPDATE ON public.voice_corpus
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- LIVE COMMENTARY (Full Time Live, Phase 2, wired now so no rework) ----------
CREATE TABLE public.live_commentary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute      INT,
  event_id    UUID REFERENCES public.match_events(id) ON DELETE SET NULL,
  text        TEXT NOT NULL,
  importance  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX live_commentary_match_idx ON public.live_commentary(match_id, created_at DESC);
GRANT SELECT ON public.live_commentary TO anon, authenticated;
GRANT ALL    ON public.live_commentary TO service_role;
ALTER TABLE public.live_commentary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live commentary public" ON public.live_commentary FOR SELECT TO anon, authenticated USING (true);

-- ---------- DROPS (anchors a day's edition + its coda + per-tz send state) ----------
CREATE TABLE public.drops (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_date            DATE NOT NULL UNIQUE,
  synthesis_insight_id UUID REFERENCES public.synthesis_insights(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'building'
                        CHECK (status IN ('building','ready','sending','sent')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drops TO anon, authenticated;
GRANT ALL    ON public.drops TO service_role;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drops ready public" ON public.drops
  FOR SELECT TO anon, authenticated USING (status IN ('ready','sending','sent'));
CREATE TRIGGER drops_updated_at BEFORE UPDATE ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- PROFILES + PUSH: per-timezone fanout + locale ----------
ALTER TABLE public.profiles
  ADD COLUMN timezone TEXT,                        -- IANA, e.g. 'Europe/London'
  ADD COLUMN locale   TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.push_subscriptions
  ADD COLUMN timezone       TEXT,
  ADD COLUMN last_drop_sent DATE;                  -- guards against double-send per timezone

-- ---------- STORAGE: create the buckets the pipeline writes to ----------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('episodes','episodes', true),
  ('share','share', true)
ON CONFLICT (id) DO UPDATE SET public = true;
-- 'episodes' SELECT policy already exists from the base migration; add 'share'.
CREATE POLICY "Share assets public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'share');

-- ---------- REALTIME: live surfaces ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_commentary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.synthesis_insights;
