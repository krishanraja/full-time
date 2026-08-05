-- ============================================================
-- Full Time: structured enrichment + narration upgrade
-- Additive only, safe on live data. Target project: hzadscrqmyilbisexvyz
--
-- Supports:
--   T5-T8  the angle engine (match_stats extras, match_context, h2h_cache)
--   T13    the display / spoken script split and narration provenance
--   T15    standings snapshots (post-launch, position and gap only)
--   T16    the web shadow log, which never touches the prompt in v1
-- ============================================================

-- ---------- MATCH STATS: the fields the Tier B angles need ----------
ALTER TABLE public.match_stats
  ADD COLUMN IF NOT EXISTS home_blocked  INT,
  ADD COLUMN IF NOT EXISTS away_blocked  INT,
  ADD COLUMN IF NOT EXISTS home_saves    INT,
  ADD COLUMN IF NOT EXISTS away_saves    INT,
  ADD COLUMN IF NOT EXISTS home_fouls    INT,
  ADD COLUMN IF NOT EXISTS away_fouls    INT,
  ADD COLUMN IF NOT EXISTS home_offsides INT,
  ADD COLUMN IF NOT EXISTS away_offsides INT;

-- ---------- MATCH CONTEXT: per-fixture facts that are not events or stats ----------
CREATE TABLE IF NOT EXISTS public.match_context (
  match_id       TEXT PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  matchday       INT,
  home_gk_name   TEXT,            -- startXI pos = 'G', for the KEEPER angle
  away_gk_name   TEXT,
  home_gk_subbed BOOLEAN NOT NULL DEFAULT false,
  away_gk_subbed BOOLEAN NOT NULL DEFAULT false,
  feeds_agree    BOOLEAN,         -- api-football vs football-data.org on the score
  crosscheck_src TEXT,
  source         TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_context TO anon, authenticated;
GRANT ALL    ON public.match_context TO service_role;
ALTER TABLE public.match_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Match context is public" ON public.match_context;
CREATE POLICY "Match context is public" ON public.match_context
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- HEAD TO HEAD CACHE: one call per pairing per season ----------
CREATE TABLE IF NOT EXISTS public.h2h_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id    TEXT NOT NULL REFERENCES public.leagues(id),
  season       INT  NOT NULL,
  team_a_id    TEXT NOT NULL REFERENCES public.teams(id),   -- lexicographically smaller id
  team_b_id    TEXT NOT NULL REFERENCES public.teams(id),
  meetings     JSONB NOT NULL,   -- [{date, home_id, away_id, home_goals, away_goals}], FT + same league only
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT h2h_pair_uniq UNIQUE (league_id, season, team_a_id, team_b_id),
  CONSTRAINT h2h_pair_ordered CHECK (team_a_id < team_b_id)
);
GRANT ALL ON public.h2h_cache TO service_role;
ALTER TABLE public.h2h_cache ENABLE ROW LEVEL SECURITY;   -- service_role only, no public policy

-- ---------- STANDINGS SNAPSHOTS: T15, position and gap only, never movement ----------
CREATE TABLE IF NOT EXISTS public.standings_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id    TEXT NOT NULL REFERENCES public.leagues(id),
  season       INT  NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows         JSONB NOT NULL,   -- [{team_id, rank, points, goalsDiff, played, win, draw, lose, description}]
  CONSTRAINT standings_snapshot_uniq UNIQUE (league_id, season, captured_at)
);
CREATE INDEX IF NOT EXISTS standings_league_idx
  ON public.standings_snapshots(league_id, season, captured_at DESC);
GRANT ALL ON public.standings_snapshots TO service_role;
ALTER TABLE public.standings_snapshots ENABLE ROW LEVEL SECURITY;

-- ---------- EDITORIAL SIGNALS: T16 web shadow log, never read by the pipeline in v1 ----------
CREATE TABLE IF NOT EXISTS public.editorial_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  angle         TEXT NOT NULL,        -- closed enum emitted by the classifier
  subject       TEXT,                 -- must be a team or competition; never a player
  subject_kind  TEXT CHECK (subject_kind IN ('team','competition','manager')),
  domains       TEXT[] NOT NULL DEFAULT '{}',   -- distinct eTLD+1, allowlisted
  confidence    TEXT,
  raw           JSONB,
  status        TEXT NOT NULL DEFAULT 'shadow'
                CHECK (status IN ('shadow','pending','approved','rejected')),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS editorial_signals_match_idx ON public.editorial_signals(match_id);
GRANT ALL ON public.editorial_signals TO service_role;
ALTER TABLE public.editorial_signals ENABLE ROW LEVEL SECURITY;   -- no public policy, ever

-- ---------- EPISODES: narration provenance + the angle actually used ----------
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS spoken_script TEXT,
  ADD COLUMN IF NOT EXISTS tts_model     TEXT,
  ADD COLUMN IF NOT EXISTS tts_voice_id  TEXT,
  ADD COLUMN IF NOT EXISTS tts_seed      BIGINT,
  ADD COLUMN IF NOT EXISTS angle_id      TEXT,
  ADD COLUMN IF NOT EXISTS lufs          NUMERIC;

CREATE INDEX IF NOT EXISTS episodes_angle_idx ON public.episodes(angle_id, published_at DESC);

-- A delivery tag can never reach a screen or a podcast feed. `script` is the
-- display transcript; tags live only in `spoken_script`, which is TTS-only.
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS episodes_script_no_brackets;
ALTER TABLE public.episodes
  ADD CONSTRAINT episodes_script_no_brackets
  CHECK (position('[' in script) = 0 AND position(']' in script) = 0);

-- ---------- DATA FIXES (T12) ----------
-- The prompt was handing the model two of the exact phrases the gate rejects.
-- Fix the data, not the gate.
UPDATE public.voice_corpus SET active = false
 WHERE kind = 'example'
   AND (content ILIKE '%draw your own conclusions%'
     OR content ILIKE '%not drawing them for you%'
     OR content ILIKE '%table does not ask%');

-- Same defect, one tier up and not in the original plan's list: the
-- per_match_type guidance for a scrappy win literally instructed the model to
-- play "the table-doesn't-ask move" and then quoted the banned phrase as the
-- worked example. Keep the guidance, drop the exemplar the gate rejects.
UPDATE public.voice_corpus
   SET content = 'Honest about the quality, credits the result anyway. '
               || 'Name the gap between how it looked and what it earned, then stop. '
               || '''United won 1-0. They were not good. They were good enough.'' '
               || 'Composed, slightly dry, never sneering.',
       updated_at = now()
 WHERE kind = 'per_match_type'
   AND match_type ILIKE 'Scrappy%'
   AND content ILIKE '%table does not ask%';

-- 'analyst' is not in the app's pundit enum (zen, gaffer, stats, romantic, doomer, banter).
UPDATE public.episodes SET voice_style = 'gaffer' WHERE voice_style = 'analyst';
