# 04 · Data Model

**Role:** Anyone reading or writing the database.
**Read this when:** writing a query, adding a column, changing RLS, debugging permission errors.
**Don't read this when:** you only need the system shape (→ `03-architecture.md`).

---

## Schema (Postgres / Supabase)

Supabase project `hzadscrqmyilbisexvyz`. All 15 tables live in `public`, RLS is enabled on every one, and each has explicit `GRANT`s. See the migrations under `supabase/migrations/`. Note that `leagues`, `teams`, `matches`, and `players` use provider-style `TEXT` primary keys (not uuid); the generated and user tables use `uuid`.

The tables group into: football reference data (`leagues`, `teams`, `players`, `matches`, `match_events`, `match_stats`), generated content (`episodes`, `synthesis_insights`, `drops`, `live_commentary`), the persona corpus that feeds generation (`voice_corpus`), and user data (`profiles`, `follows`, `listens`, `push_subscriptions`).

### `leagues`
Reference list of competitions we cover (Big 5). Seeded.

| Column | Type | Notes |
|---|---|---|
| `id` | text | pk, e.g. `epl`, `laliga` |
| `name` | text | "Premier League", "La Liga", etc. |
| `country` | text | "England", "Spain", … |
| `created_at` | timestamptz | |

**RLS:** public read (`SELECT` to `anon` + `authenticated`). Writes via service role only.

### `teams`
Club registry. Seeded.

| Column | Type | Notes |
|---|---|---|
| `id` | text | pk, e.g. `ars` |
| `name` | text | "Arsenal" |
| `short` | text | "ARS" |
| `league_id` | text → leagues | `ON DELETE RESTRICT` |
| `color` | text | hex, default `#888888`, for per-team accents |
| `crest_url` | text | optional |
| `created_at` | timestamptz | |

**RLS:** public read.

### `players`
Grounding registry for scorers and career tallies. Feeds the fact-pack.

| Column | Type | Notes |
|---|---|---|
| `id` | text | pk = provider player id |
| `name` | text | |
| `team_id` | text → teams | `ON DELETE SET NULL` |
| `created_at` | timestamptz | |

**RLS:** public read.

### `matches`
Match results and fixtures. Current data is seeded (2023-24 season). A live API-Football ingest slots in via the same shape (roadmap).

| Column | Type | Notes |
|---|---|---|
| `id` | text | pk, e.g. `m_ars_liv` |
| `league_id` | text → leagues | |
| `home_team_id` | text → teams | |
| `away_team_id` | text → teams | |
| `home_score` | int | null until finished |
| `away_score` | int | |
| `kickoff_at` | timestamptz | |
| `status` | text | "scheduled" \| "live" \| "finished" (default "scheduled") |
| `importance_score` | numeric | default 0; used to pick the biggest moment |
| `created_at` | timestamptz | |

**Indexes:** `kickoff_at DESC`, `status`.
**RLS:** public read. Writes via service role only (seed / future ingest).

### `match_events`
The factual record the narration is grounded against. The deterministic fact-pack (goal log with running score, scorer summary by team, own-goal and penalty tagging, cards) is built from these rows, and the code gate matches scorers back to them.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `match_id` | text → matches | `ON DELETE CASCADE` |
| `minute` | int | 0 to 130 |
| `added_time` | int | |
| `type` | text | goal \| own_goal \| penalty_goal \| penalty_miss \| yellow \| red \| second_yellow \| sub \| var |
| `team_id` | text → teams | |
| `player_id` | text → players | |
| `player_name` | text | denormalized provider name when not in `players` |
| `assist_player_id` | text → players | |
| `detail` | text | freeform provider detail |
| `source` | text | which feed produced it |
| `created_at` | timestamptz | |

**Indexes:** `match_id`, `type`.
**RLS:** public read. Writes via service role only.

### `match_stats`
xG / possession / shots, the full-match numbers that feed synthesis. One row per match.

| Column | Type | Notes |
|---|---|---|
| `match_id` | text → matches | pk, `ON DELETE CASCADE` |
| `home_xg` / `away_xg` | numeric | |
| `home_possession` / `away_possession` | int | |
| `home_shots` / `away_shots` | int | |
| `home_sot` / `away_sot` | int | shots on target |
| `home_corners` / `away_corners` | int | |
| `source` | text | |
| `updated_at` | timestamptz | |

**RLS:** public read. Writes via service role only.

### `episodes`
The generated recap. Realtime is enabled on INSERT. Written only by the pipeline (`runEpisodePipeline` → `recap-generator.server.ts`), after the deterministic code gate and the Sonnet contradiction judge both pass; the pipeline is fail-closed, so no row means no episode rather than a wrong one.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `match_id` | text → matches | `ON DELETE CASCADE` |
| `voice_style` | text | default "analyst" |
| `title` | text | derived in pipeline |
| `hook` | text | first sentence of script |
| `script` | text | full body, what TTS read |
| `audio_url` | text | public Storage URL (ElevenLabs mp3) |
| `duration_sec` | int | default 90 |
| `badge` | text | nullable: "BIGGEST MOMENT" \| "LATE DRAMA" \| "DEMOLITION" \| "CLASSIC" |
| `published_at` | timestamptz | default `now()` |
| `created_at` | timestamptz | |
| `segments` | jsonb | `[{seg:'lede'\|'story'\|'magic'\|'forward', text, start_sec, end_sec}]` |
| `magic_sentence` | text | the coda line; source for the auto-cut share clip |
| `forward_line` | text | |
| `share_clip_url` | text | 15s magic-sentence audiogram |
| `og_image_url` | text | scoreline OG card |
| `locale` | text | default "en" |
| `model` | text | llm / tts provenance |
| `verification` | jsonb | `{score_ok, grounded, feeds_agree, checks:[...]}` |
| `status` | text | default "published": draft \| verifying \| published \| held \| failed |

**Unique:** `(match_id, locale)`, one episode per match per locale (transactional idempotency).
**RLS:** public read. Writes via service role only (the pipeline).
**Realtime:** ENABLED on INSERT.

### `synthesis_insights`
The curated "one thing we noticed" morning coda. The LLM phrases a fact the engine has already proven; `computed_payload` holds the deterministic evidence.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `drop_date` | date | |
| `kind` | text | cross_league_simultaneity \| streak \| drought \| historical_rarity \| set_piece \| milestone \| coincidence |
| `text` | text | the phrased coda line |
| `computed_payload` | jsonb | deterministic evidence proving it true |
| `surprise_score` | numeric | default 0 |
| `status` | text | default "pending": pending \| approved \| shipped \| rejected |
| `audio_url` | text | |
| `card_image_url` | text | |
| `reviewed_by` | uuid → auth.users | `ON DELETE SET NULL` |
| `created_at` / `updated_at` | timestamptz | |

**Index:** `drop_date DESC`.
**RLS:** public can `SELECT` only rows where `status = 'shipped'`; pending / approved / rejected stay internal.
**Realtime:** ENABLED. `updated_at` maintained by trigger.

### `drops`
Anchors a day's edition, its coda, and per-timezone send state.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `drop_date` | date | unique |
| `synthesis_insight_id` | uuid → synthesis_insights | `ON DELETE SET NULL` |
| `status` | text | default "building": building \| ready \| sending \| sent |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** public can `SELECT` only when `status IN ('ready','sending','sent')`. `updated_at` maintained by trigger.

### `live_commentary`
Full Time Live (Phase 2). Table is wired now so there is no rework later; not yet populated.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `match_id` | text → matches | `ON DELETE CASCADE` |
| `minute` | int | |
| `event_id` | uuid → match_events | `ON DELETE SET NULL` |
| `text` | text | |
| `importance` | int | default 0 |
| `created_at` | timestamptz | |

**Index:** `(match_id, created_at DESC)`.
**RLS:** public read.
**Realtime:** ENABLED.

### `voice_corpus`
Founder-editable persona corpus that conditions the Opus writer (style rules, do / dont lists, examples, banned terms). Around 127 rows. Never public: `GRANT ALL` to `service_role` only, RLS enabled with no `anon` / `authenticated` policy, so it is locked to service role.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `kind` | text | style_rule \| do \| dont \| example \| red_example \| per_match_type \| banned_term \| motif \| anti_tone |
| `match_type` | text | for `per_match_type` entries |
| `content` | text | |
| `weight` | numeric | default 1 |
| `active` | boolean | default true |
| `version` | int | default 1 |
| `created_at` / `updated_at` | timestamptz | |

**Index:** partial on `kind` `WHERE active`.
**RLS:** service role only (no public policy). `updated_at` maintained by trigger.

### `profiles`
Auto-created on signup via the `handle_new_user` trigger. Holds preferences, timezone / locale, and the Stripe billing state.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk = `auth.users.id`, `ON DELETE CASCADE` |
| `display_name` | text | optional |
| `voice_style_pref` | text | default "analyst" (see note below) |
| `created_at` / `updated_at` | timestamptz | |
| `timezone` | text | IANA, e.g. `Europe/London` |
| `locale` | text | default "en" |
| `plan` | text | default "free": free \| pro |
| `stripe_customer_id` | text | |
| `stripe_subscription_id` | text | |
| `subscription_status` | text | Stripe sub status verbatim |
| `current_period_end` | timestamptz | |
| `price_id` | text | |

**Indexes:** `stripe_customer_id`, `stripe_subscription_id`.
**RLS:** user can `SELECT` / `INSERT` / `UPDATE` only their own row (`auth.uid() = id`).
**Billing guard:** a `BEFORE INSERT OR UPDATE` trigger, `profiles_billing_guard` (function `enforce_profile_billing_guard`), makes the billing columns (`plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `price_id`) effectively writable only by `service_role`. When the caller role is `authenticated` or `anon` it forces those columns to defaults on INSERT and back to their `OLD` values on UPDATE. This closed a real self-grant-Pro hole: without it, the "Profiles self update" policy would let a user set `plan = 'pro'` directly. Only the Stripe webhook's admin client (service role) writes real billing state.

**Note on `voice_style_pref`:** the DB column default is `analyst` and has no CHECK constraint, but the app's pundit set is `zen`, `gaffer`, `stats`, `romantic`, `doomer`, `banter`. Free tier gets only `zen` (The Reporter); the other five are Full Time Pro. The Pro gate is enforced in the `setVoiceStyle` server function (it reads `plan` before saving) and in the UI, not by a trigger on this column. The `plan` it reads is trustworthy because of the billing guard above.

### `follows`
Which teams or leagues a user follows. Drives club-first feed ordering.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid → auth.users | `ON DELETE CASCADE` |
| `entity_type` | text | "team" \| "league" |
| `entity_id` | text | team or league id |
| `created_at` | timestamptz | |

**Primary key:** `(user_id, entity_type, entity_id)`.
**RLS:** user can `SELECT` / `INSERT` / `UPDATE` / `DELETE` only their own rows (`auth.uid() = user_id`).

### `listens`
Play analytics. Either user-scoped or anonymous.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid → auth.users | nullable, `ON DELETE CASCADE` |
| `episode_id` | uuid → episodes | `ON DELETE CASCADE` |
| `completed` | boolean | default false |
| `listened_at` | timestamptz | default `now()` |

**Index:** `episode_id`.
**Grants:** `authenticated` gets `SELECT` / `INSERT` / `UPDATE` / `DELETE`; `anon` gets `INSERT` only; `service_role` gets all.
**RLS:** `authenticated` may `SELECT` only their own rows and `INSERT` with `user_id = auth.uid()`; `anon` may `INSERT` only with `user_id IS NULL`. There is no public `SELECT`, so no user sees another user's listens.

### `push_subscriptions`
Web Push VAPID endpoints per user / device, with per-timezone send guards.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `user_id` | uuid → auth.users | `ON DELETE CASCADE` |
| `endpoint` | text | unique |
| `p256dh` | text | |
| `auth` | text | |
| `created_at` | timestamptz | |
| `timezone` | text | for per-timezone fanout |
| `last_drop_sent` | date | guards against double-send per timezone |

**RLS:** user can `SELECT` / `INSERT` / `UPDATE` / `DELETE` only their own rows. Fanout reads via service role.

## Storage buckets

Both buckets are public and created by the migrations. The pipeline writes to them via service role.

- **`episodes`** (public): episode audio (ElevenLabs mp3). A `storage.objects` SELECT policy allows `anon` + `authenticated` to read where `bucket_id = 'episodes'`.
- **`share`** (public): share clips and OG card images. A `storage.objects` SELECT policy allows `anon` + `authenticated` to read where `bucket_id = 'share'`.

## Internal functions and triggers

- `public.handle_new_user()`: `AFTER INSERT` trigger (`on_auth_user_created`) on `auth.users`; creates the profile row. `SECURITY DEFINER`, `search_path = public`, revoked from `anon` / `authenticated`.
- `public.tg_set_updated_at()`: generic `updated_at` setter. Wired to `profiles`, `synthesis_insights`, `voice_corpus`, and `drops`. `search_path = public`, revoked from `anon` / `authenticated`.
- `public.enforce_profile_billing_guard()`: `BEFORE INSERT OR UPDATE` trigger (`profiles_billing_guard`) on `profiles`. `SECURITY INVOKER` (default), so `current_user` reflects the real caller role; it neutralizes billing-column writes from `authenticated` / `anon` and lets `service_role` through. See the `profiles` billing-guard note above.

Only the database invokes `handle_new_user` and `tg_set_updated_at` via their triggers.

## Realtime

`supabase_realtime` publishes `episodes` (INSERT is what the client listens for), `live_commentary`, and `synthesis_insights`.

## Common queries

```sql
-- Today's published episodes, newest first
SELECT id, title, hook, audio_url, badge, duration_sec
FROM episodes
WHERE status = 'published'
  AND published_at >= now() - interval '24 hours'
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

- Migrations, in order: three base files (`20260617070002_*`, `20260617070022_*`, `20260617070302_*`, uuid-suffixed), then `20260617130000_magic_engine_extensions.sql` (the 7 magic-engine tables plus `episodes` / `profiles` / `push_subscriptions` columns, storage buckets, and realtime), then `20260705120000_billing.sql` (the `profiles` billing columns and the billing guard). Newer files use descriptive names.
- Every new public table block is `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`, in that order.
- Never grant to `anon` unless the policy actually allows anon access.
- Do not touch `auth`, `realtime`, `storage`, `supabase_functions`, or `vault` casually. The migrations here do manage the `storage` buckets / `storage.objects` policies and the `supabase_realtime` publication deliberately, as service-role changes; keep any such change inside its own reviewed migration.
