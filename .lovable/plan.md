# Production Build Plan

**Pick a name first** — I'll bake it into copy, manifest, OG tags, and the morning push template. My top three: **Full Time**, **Touchline FM**, **Three Minutes**. Reply with one (or your own) and I'll start.

## Locked decisions

| Area | Choice |
|---|---|
| Stack | TanStack Start (current project) + Tailwind v4 + Framer Motion |
| Backend | Lovable Cloud (Postgres + Storage + Auth) |
| Data source | Mocked at v1; structured so a real API-Football adapter slots in later |
| LLM | Lovable AI Gateway → `google/gemini-3-flash-preview` |
| TTS | ElevenLabs (connector) — `eleven_turbo_v2_5`, 1 voice per style |
| Recap length | ~60 seconds / 120–150 words |
| Coverage | Big 5 leagues only |
| Drop cadence | One 7am morning drop |
| Cron | External cron (GitHub Actions) hitting a signed `/api/public/cron/daily-drop` route |
| Storage | Supabase Storage bucket `episodes`, public read |
| Auth | Optional email magic-link via Lovable Cloud |
| Push | Web Push (VAPID) for installed PWA users |
| Monetization | None at launch |
| Analytics | Plausible (script tag + a couple custom events) |
| Scale target | 1k–10k users |
| Safety | Conservative LLM output filtering (no rumours, profanity filter, no real-commentator impressions) |
| Install | Manifest-only PWA, dark theme, `display: standalone`, custom icons |

## Architecture

```text
[GitHub Actions cron 06:30 UTC]
        │  HMAC-signed POST
        ▼
/api/public/cron/daily-drop ── verifies signature
        │
        ├─► pull yesterday's Big-5 results from `matches` table
        │   (seeded from mock data in v1; adapter-ready for API-Football)
        │
        ├─► for each match:
        │     1. Lovable AI → 120-word script (system prompt enforces style, no rumours)
        │     2. Safety pass: profanity filter + banned-terms regex
        │     3. ElevenLabs TTS → mp3 → Supabase Storage (`episodes/yyyy-mm-dd/<id>.mp3`)
        │     4. INSERT into `episodes` (title, hook, script, audio_url, duration, badge…)
        │
        ├─► pick "Biggest moment" via simple score (goals + late goals + rivalry weight)
        │
        └─► fan-out web push to subscribers via `push_subscriptions` table
                "Today's recaps are live. 4 min total."
```

Browser side: same UX you have now, but Episode/Team/Tonight come from Cloud, the player uses a real `<audio>` element with MediaSession metadata, and a `useEpisodes()` hook subscribes to realtime inserts so the morning drop animates in if the user is already on the page.

## Database (Postgres / Lovable Cloud)

| Table | Purpose | Key columns |
|---|---|---|
| `teams` | Big-5 club registry | id, name, short, league, color, crest_url |
| `leagues` | Reference list | id, name, country |
| `matches` | Match results | id, home_team_id, away_team_id, home_score, away_score, kickoff_at, status, importance_score |
| `episodes` | Generated recaps | id, match_id, voice_style, title, hook, script, audio_url, duration_sec, badge, published_at |
| `profiles` | Optional user profile | id (=auth.users.id), display_name, voice_style_pref |
| `follows` | Which teams/leagues a user follows | user_id, entity_type, entity_id |
| `push_subscriptions` | Web Push endpoints | user_id, endpoint, p256dh, auth |
| `listens` | Analytics: completed plays | user_id, episode_id, completed, listened_at |

RLS: `episodes`, `matches`, `teams`, `leagues` are public-read. `follows`, `push_subscriptions`, `listens`, `profiles` are user-scoped via `auth.uid()`. `episodes` writes only via service role (cron).

## Server functions & routes

- `getTodayFeed` (server fn, public via publishable client) — hero + carousel + tonight in one call.
- `getEpisode(id)` — single episode + signed audio URL.
- `toggleFollow` (auth required) — write to `follows`.
- `recordListen` (auth or anonymous device id) — write to `listens`.
- `subscribeToPush` (auth required) — store VAPID subscription.
- `POST /api/public/cron/daily-drop` — HMAC-verified, the orchestrator above.
- `POST /api/public/webhooks/match-finished` (future) — when real-time data lands.

## Frontend changes

- Replace mock store reads with TanStack Query against server fns; keep the same component shapes.
- Real `<audio>` element + MediaSession (lock-screen play/pause/seek, artwork).
- PWA manifest, theme color, app icons (generated), install prompt after second visit.
- Auth screen: single-screen magic-link, deferred until user taps "Sync across devices" or "Get the morning nudge".
- Notification opt-in card on Following screen.
- Plausible script + 4 events: `play`, `complete`, `follow`, `push_opt_in`.
- Realtime channel on `episodes` so the morning drop animates in.
- `/legal/privacy`, `/legal/terms`, AI-disclosure already lives on Settings.

## Content safety

- System prompt commits to: no quoting real broadcasters, no transfer speculation, no injuries beyond confirmed, no betting language, no political commentary, no slurs.
- Banned-terms regex run on every generated script; on hit, regenerate once, then skip the episode.
- `profanity-filter` npm pass as second net.
- AI disclosure on Settings + a small "🤖 AI-narrated" tag under each player.

## Things I will NOT do at v1

- Real match data wiring (you said mock for now; adapter interface ready)
- Native apps
- Login required
- Payments
- Comments / social features
- Stats / tables / league standings

## Build order (single session)

1. Enable Lovable Cloud, generate migrations for all tables, seed Big-5 teams + 1 day of demo matches & episodes.
2. Server functions (`getTodayFeed`, follows, listens) + swap frontend reads off mocks. App still looks identical, now powered by DB.
3. Real `<audio>` playback + MediaSession + actual `audio_url` from Storage. I'll use a short demo mp3 in the seed.
4. AI pipeline: Lovable AI script gen → ElevenLabs TTS → Storage upload — wired as a single server function `generateEpisodeForMatch(matchId)`.
5. Cron route `/api/public/cron/daily-drop` with HMAC, plus a GitHub Actions workflow file (`.github/workflows/daily-drop.yml`) you can enable when you connect the repo.
6. Auth (magic link), follows persisted to DB, settings persisting voice style.
7. Web Push: VAPID keys (I'll prompt you to add them as secrets), service worker for push delivery, opt-in card, fan-out from cron.
8. PWA manifest + generated icon + install prompt.
9. Plausible + privacy/terms pages + final polish + README rewrite + publish.

## Where I'll need things from you mid-build

- **Name** — before I start.
- **ElevenLabs connection** — I'll trigger the connector flow when we hit step 4.
- **VAPID public/private keys for Web Push** — I'll add secrets when we hit step 7; one command to generate.
- **GitHub repo connected** — only needed to actually run the cron; the workflow file ships either way.
- **Plausible domain** — quick paste at step 9.

Reply with the name (e.g. "Full Time") and I'll execute the plan end-to-end.
