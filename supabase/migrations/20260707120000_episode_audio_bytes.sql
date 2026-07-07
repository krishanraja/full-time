-- ============================================================
-- Full Time: podcast distribution (RSS feed) support.
-- Adds the byte size of each episode's audio file so the RSS
-- <enclosure length="..."> attribute can be set without a
-- HEAD request at feed-render time. Nullable, backfilled once
-- for existing rows (see _ops/backfill-audio-bytes.mjs), then
-- set going forward by the generation pipeline at upload time.
-- ============================================================

ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS audio_bytes integer;
