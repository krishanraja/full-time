# Full Time

Daily AI-narrated football recaps. Big-5 leagues. ~60 seconds per match. One morning drop. Optional account, optional push.

## Stack

- TanStack Start (React 19) + Tailwind v4 + Framer Motion
- Lovable Cloud (Postgres + Storage + Auth + Realtime)
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for script generation
- ElevenLabs (`eleven_turbo_v2_5`) for TTS
- Web Push via VAPID
- Plausible analytics (cookieless)
- PWA (manifest + push service worker)

## Architecture

```
GitHub Actions cron (06:30 UTC, daily)
  └─ POST /api/public/cron/daily-drop   (auth: apikey header = SUPABASE_PUBLISHABLE_KEY)
       ├─ pick finished Big-5 matches without an episode
       ├─ for each:
       │     1. Lovable AI → 120-word recap script (banned-terms regex filter, retry once)
       │     2. ElevenLabs TTS → mp3
       │     3. Upload to Supabase Storage bucket `episodes/yyyy-mm-dd/<id>.mp3`
       │     4. INSERT into `episodes` (triggers Realtime → live UI update)
       └─ Web Push fan-out via `push_subscriptions`
```

## Data model

| Table | Notes |
|---|---|
| `leagues`, `teams`, `matches` | Reference + match results, public-read |
| `episodes` | One per match; service-role writes only, public read |
| `profiles` | Auto-created on signup; voice style preference |
| `follows` | Teams / leagues per user |
| `push_subscriptions` | VAPID endpoints per user |
| `listens` | Play analytics; anon inserts allowed |

RLS on every table. User-owned tables scope to `auth.uid()`. Audio bucket public-read, write only via service role.

## Mid-build secrets needed

| Secret | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | TTS (auto-synced by Lovable connector) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push fan-out |
| `VAPID_SUBJECT` | `mailto:hello@yourdomain.com` |

Generate VAPID keys locally with: `npx web-push generate-vapid-keys`

## Cron setup

In your GitHub repo, add these Actions secrets:
- `FULL_TIME_URL` — `https://project--{project-id}.lovable.app`
- `SUPABASE_PUBLISHABLE_KEY` — the publishable/anon key

The workflow in `.github/workflows/daily-drop.yml` triggers at 06:30 UTC daily and can be run manually for testing.

## Local dev

Routes (TanStack file-based):
- `/` — Today (hero + carousel + tonight)
- `/feed` — All recaps today
- `/following` — Pick teams + leagues
- `/settings` — Voice, notifications, account
- `/auth` — Magic-link sign in
- `/legal/privacy`, `/legal/terms`
- `/api/public/cron/daily-drop` — cron endpoint

Server functions live in `src/lib/api/*.functions.ts`.

## Content safety

- System prompt forbids: real-broadcaster impressions, transfer rumours, betting language, injury speculation, political commentary, slurs.
- Banned-terms regex runs on every generated script; one retry on hit, otherwise the episode is skipped.
- AI disclosure surfaced in Settings.

## What's NOT in v1

- Live match data (mock seed; API-Football adapter slots in via `matches` table)
- Native apps
- Required login
- Payments / comments / standings
