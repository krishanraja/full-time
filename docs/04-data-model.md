# 04 · Data Model

**Role:** Anyone reading or writing the database.
**Read this when:** writing a query, adding a column, changing RLS, debugging permission errors.
**Don't read this when:** you only need the system shape (→ `03-architecture.md`).

---

## Schema (Postgres / Lovable Cloud)

All tables live in `public`. Every public table has explicit `GRANT`s — see migrations under `supabase/migrations/`.

### `leagues`
Reference list of competitions we cover (Big 5).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `name` | text | "Premier League", "La Liga", etc. |
| `country` | text | "England", "Spain", … |

**RLS:** public read (`SELECT` to `anon` + `authenticated`). No writes from app.

### `teams`
Club registry.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `name` | text | "Arsenal" |
| `short` | text | "ARS" |
| `league_id` | uuid → leagues | |
| `color` | text | hex, for future per-team accents |
| `crest_url` | text | optional |

**RLS:** public read.

### `matches`
Match results. v1 is seeded from mock; the API-Football adapter slots in via the same shape.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `home_team_id` | uuid → teams | |
| `away_team_id` | uuid → teams | |
| `league_id` | uuid → leagues | |
| `home_score` | int | null until status=finished |
| `away_score` | int | |
| `kickoff_at` | timestamptz | |
| `status` | text | "scheduled" \| "live" \| "finished" |
| `importance_score` | numeric | 0–10; used to pick the "Biggest moment" |

**RLS:** public read. Writes via service role only (seed / future adapter).

### `episodes`
The generated recap. Realtime is enabled on INSERT.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `match_id` | uuid → matches | unique — one episode per match |
| `voice_style` | text | null \| "classic" \| "wit" \| "concise" |
| `title` | text | derived in pipeline |
| `hook` | text | first sentence of script |
| `script` | text | full body, what TTS read |
| `audio_url` | text | public Storage URL |
| `duration_sec` | int | estimated from word count |
| `badge` | text | nullable — "BIGGEST MOMENT" \| "LATE DRAMA" \| "CLASSIC" \| "DEMOLITION" |
| `published_at` | timestamptz | default `now()` |

**RLS:** public read. Writes via service role only (the pipeline).
**Realtime:** ENABLED on INSERT.

### `profiles`
Auto-created on signup via a `handle_new_user` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk = `auth.users.id` |
| `display_name` | text | optional |
| `voice_style_pref` | text | "classic" \| "wit" \| "concise" |
| `created_at` | timestamptz | |

**RLS:** user can SELECT/UPDATE only own row (`auth.uid() = id`).

### `follows`
Which teams or leagues a user follows.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid → auth.users | |
| `entity_type` | text | "team" \| "league" |
| `entity_id` | uuid | |
| `created_at` | timestamptz | |

**Unique:** `(user_id, entity_type, entity_id)`.
**RLS:** user can SELECT/INSERT/DELETE only own rows.

### `push_subscriptions`
Web Push VAPID endpoints per user/device.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid → auth.users | |
| `endpoint` | text | unique |
| `p256dh` | text | |
| `auth` | text | |
| `created_at` | timestamptz | |

**RLS:** user can SELECT/INSERT/DELETE only own rows. Fanout reads via service role.

### `listens`
Play analytics. Either user-scoped or anonymous (device).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid → auth.users | nullable |
| `device_id` | text | nullable; client-generated when anon |
| `episode_id` | uuid → episodes | |
| `completed` | boolean | true if listened past 90% |
| `listened_at` | timestamptz | default `now()` |

**RLS:** INSERT allowed to `anon` + `authenticated` (with `user_id = auth.uid()` OR `user_id IS NULL` constraint). SELECT to service role only (we don't expose other users' listens).

## Internal functions

- `public.handle_new_user()` — trigger on `auth.users` insert; creates profile row.
- `public.tg_set_updated_at()` — generic timestamp setter for tables with `updated_at`.

Both are `SECURITY DEFINER`, `search_path = public`, and revoked from `anon`/`authenticated` — only the database invokes them via triggers.

## Common queries

```sql
-- Today's published episodes, newest first
SELECT id, title, hook, audio_url, badge, duration_sec
FROM episodes
WHERE published_at >= now() - interval '24 hours'
ORDER BY published_at DESC;

-- Finished Big-5 matches in the last 36h without an episode (cron pickup)
SELECT m.id
FROM matches m
LEFT JOIN episodes e ON e.match_id = m.id
WHERE m.status = 'finished'
  AND m.kickoff_at >= now() - interval '36 hours'
  AND e.id IS NULL
ORDER BY m.importance_score DESC
LIMIT 8;

-- A user's follow set
SELECT entity_type, entity_id
FROM follows
WHERE user_id = auth.uid();
```

## Migration policy

- One change per migration file. Filename = `YYYYMMDDhhmmss_<uuid>.sql` (Lovable Cloud convention).
- Every new public table block must be `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`, in that order.
- Never grant to `anon` unless the policy actually allows anon access.
- Never touch the `auth`, `storage`, `realtime`, `supabase_functions`, or `vault` schemas.
