# 03 · Architecture

**Role:** Developer or ops agent who needs the system topology.
**Read this when:** designing a change that crosses the cron → AI → TTS → storage → realtime → push chain.
**Don't read this when:** you only need to touch a single component (→ `02-developer.md`).

---

## High-level diagram

```text
            ┌───────────────────────┐
            │ GitHub Actions cron    │  06:30 UTC daily
            │ .github/workflows/...  │
            └───────────┬────────────┘
                        │ POST  apikey: SUPABASE_PUBLISHABLE_KEY
                        ▼
            ┌───────────────────────────────────────────┐
            │  /api/public/cron/daily-drop              │  src/routes/api/public/cron.daily-drop.ts
            │  - verifies apikey                        │
            │  - selects finished Big-5 matches w/o ep  │
            └─────────────┬─────────────────────────────┘
                          │ per match
                          ▼
            ┌───────────────────────────────────────────┐
            │  generateEpisodeForMatch (server fn)      │  src/lib/api/episode-pipeline.functions.ts
            │  1. Lovable AI → 120-word script           │
            │     google/gemini-3-flash-preview          │
            │  2. Banned-terms regex (retry once)        │
            │  3. ElevenLabs TTS → mp3                   │
            │  4. Upload to Storage bucket `episodes/`   │
            │  5. INSERT episode row                     │
            └─────────────┬─────────────────────────────┘
                          │
                          ▼
            ┌───────────────────────────────────────────┐
            │  Postgres `episodes` (realtime on INSERT)  │
            └─────────────┬─────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ┌──────────────────┐      ┌────────────────────────┐
   │ Browser subscribes│      │ fanoutMorningPush      │  src/lib/api/push-fanout.server.ts
   │ → animates new   │      │ - reads push_subs       │
   │   episode in     │      │ - sends VAPID push      │
   └──────────────────┘      └────────────────────────┘
```

## Components

### Cron entrypoint
**File:** `src/routes/api/public/cron.daily-drop.ts`
**Auth:** `apikey` header must equal `SUPABASE_PUBLISHABLE_KEY`.
**Idempotency:** Skips matches that already have an `episodes` row.
**Failure mode:** Per-match `try/catch`. One bad match does not break the drop. Push fanout runs only if ≥1 new episode.

### AI pipeline
**File:** `src/lib/api/episode-pipeline.functions.ts`
**Inputs:** `{ matchId }` (uuid).
**System prompt:** see `05-content-safety.md`. Style rules + safety constraints baked in.
**Model:** `google/gemini-3-flash-preview` via `https://ai.gateway.lovable.dev/v1/chat/completions`.
**Safety net:** `BANNED_TERMS` regex on every output, one retry.
**TTS:** ElevenLabs `eleven_turbo_v2_5`, voice `TX3LPaxmHKxFdv7VOQHJ` (Liam, analyst).
**Storage path:** `episodes/YYYY-MM-DD/{matchId}.mp3` (public read).
**DB write:** Uses `supabaseAdmin` (service role) imported INSIDE the handler — never at module scope (see `<server-side-modern>`).

### Frontend reads
**Hook:** `src/hooks/use-episodes.ts` → `useTodayFeed()`.
- TanStack Query against `getTodayFeed()` server fn (`src/lib/api/feed.functions.ts`).
- Subscribes to realtime channel on `episodes` INSERT — invalidates the query on new rows so the morning drop animates in for anyone already on the page.

### Player
**File:** `src/lib/player-store.ts`
- `useSyncExternalStore` over a singleton `<audio>` element.
- Wires `MediaSession` for lock-screen play/pause/seek/artwork.
- Falls back to a timer-based simulator when `audio_url` is empty (used by seeded demo episodes).

### Push
- Subscribe: `src/lib/push-client.ts` (client) → `subscribeToPush` server fn → row in `push_subscriptions`.
- Fanout: `fanoutMorningPush(count)` in `push-fanout.server.ts`. Reads all subs, sends a single payload, swallows individual failures.
- Display: `public/sw.js` handles `push` event and surfaces the notification.

## Data flow rules

- **Episodes are written only by the cron** (service-role). Never from a client request.
- **Listens** can be written by anonymous device or signed-in user — see RLS in `04-data-model.md`.
- **Follows / profiles / push subs** are user-scoped, RLS-gated to `auth.uid()`.

## Deployment

- Frontend + server functions: deployed by Lovable on every accepted change.
- Stable production URL: `project--909f628d-2539-43c1-a276-809849a2eeb8.lovable.app`. Use this for cron / external services so it survives renames.
- Custom domain: connect in Project settings → Domains.

## Environments

| Env | URL pattern | Used for |
|---|---|---|
| Preview (per branch) | `id-preview--<branch-id>.lovable.app` | Live preview in editor |
| Stable preview | `project--<id>-dev.lovable.app` | Stable preview link |
| Production | `project--<id>.lovable.app` (or custom domain) | Real users + cron |

## Failure modes (one-liners — see `06-ops.md` for runbooks)

| Symptom | Likely cause |
|---|---|
| Cron 401 | `SUPABASE_PUBLISHABLE_KEY` mismatch or missing in workflow secret |
| All matches fail with `LOVABLE_API_KEY missing` | Cloud key not synced to runtime |
| All TTS failures | `ELEVENLABS_API_KEY` missing / over quota |
| No push delivered | VAPID keys missing or service worker not registered |
| New episode doesn't appear without refresh | Realtime channel not connected — usually a Lovable Cloud session glitch |
