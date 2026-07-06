# 03 · Architecture

**Role:** Developer or ops agent who needs the system topology.
**Read this when:** designing a change that crosses the cron to generation to TTS to storage to realtime to push chain, or touching billing / entitlement.
**Don't read this when:** you only need to touch a single component (see `02-developer.md`).

---

## High-level diagram (the daily drop)

```text
            ┌────────────────────────────┐
            │ GitHub Actions cron         │  06:30 UTC daily (best-effort, ±10 min)
            │ .github/workflows/          │
            │   daily-drop.yml            │
            └─────────────┬──────────────┘
                          │ POST  Authorization: Bearer CRON_SECRET
                          ▼
            ┌───────────────────────────────────────────────┐
            │  POST /api/public/cron/daily-drop             │  src/routes/api/public/cron.daily-drop.ts
            │  - authorizes CRON_SECRET (pub-key fallback)  │
            │  - picks finished Big-5 matches (last 36h)    │
            │    without an episode, top 8 by importance    │
            │  - bounded concurrency 3, 240s wall budget    │
            └─────────────┬─────────────────────────────────┘
                          │ per match
                          ▼
            ┌───────────────────────────────────────────────┐
            │  runEpisodePipeline(matchId)                  │  src/lib/api/episode-pipeline.functions.ts
            │  idempotent: skip if an episode already exists │
            │    1. deterministic fact-pack (match_events)  │  ─┐
            │    2. Opus writer (voice_corpus persona)      │   │  src/lib/api/
            │    3. deterministic CODE GATE                 │   │  recap-generator.server.ts
            │    4. Sonnet CONTRADICTION JUDGE              │   │  fail-closed: publish nothing
            │    5. up to 5 surgical regens                 │  ─┘  rather than a wrong recap
            │    6. ElevenLabs TTS (Daniel) -> mp3          │
            │    7. upload to Storage bucket `episodes/`    │
            │    8. INSERT episodes row (status published)  │
            └─────────────┬─────────────────────────────────┘
                          ▼
            ┌───────────────────────────────────────────────┐
            │  Postgres `episodes` (realtime on INSERT)      │
            └─────────────┬─────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ┌──────────────────┐      ┌────────────────────────┐
   │ Browser subscribes│      │ fanoutMorningPush      │  src/lib/api/push-fanout.server.ts
   │ -> animates new   │      │ - reads push_subs       │
   │    episode in     │      │ - sends VAPID push      │
   └──────────────────┘      └────────────────────────┘
```

## Components

### Cron entrypoint
**File:** `src/routes/api/public/cron.daily-drop.ts` (TanStack file route, `POST` handler at `/api/public/cron/daily-drop`).
**Auth:** hardened. When `CRON_SECRET` is set, the request must carry `Authorization: Bearer <CRON_SECRET>`. A backward-compatible fallback (the Supabase publishable key in the `apikey` header) applies only when no `CRON_SECRET` is configured. The old behaviour of trusting the public publishable key outright is gone.
**Selection:** finished matches with `kickoff_at` in the last 36 hours, ordered by `importance_score` desc, capped at 8.
**Scale discipline:** generation is heavy (Opus writer + Sonnet judge + TTS, roughly 15 to 40s per match), so matches run with bounded concurrency (`CONCURRENCY = 3`) under a 240s wall-clock budget (`BUDGET_MS`) to stay inside the 300s serverless function limit. Anything not reached is picked up next run.
**Idempotency:** `runEpisodePipeline` skips any match that already has an `episodes` row, so retries and partial runs are safe.
**Failure mode:** per-match `try/catch`. One bad match does not break the drop. Push fanout runs only if at least one new episode was created and VAPID is configured.
**Inert until a live feed exists:** current match data is seeded (2023 to 24 season) and the date filter targets recent finished matches, so the endpoint returns without work most days. Real daily content needs a live API-Football ingest (see `12-roadmap.md`) and accepts ongoing Anthropic plus ElevenLabs cost.

### Generation engine (fact-pack to writer to gate to judge, fail-closed)
**Files:** `src/lib/api/recap-generator.server.ts` (`generateRecap`) and `src/lib/api/episode-pipeline.functions.ts` (`runEpisodePipeline`).
**What it replaced:** the old Lovable AI Gateway path (`google/gemini-3-flash-preview` via `ai.gateway.lovable.dev` plus a single banned-words regex) is gone. It was fact-starved and non-functional. Accuracy is now guaranteed by construction, not by a prompt instruction.

The pipeline, in order:

1. **Deterministic fact-pack.** Built in code from `match_events`: a `goal_log` with the running score after each goal, a `scorer_summary` grouping scorers by team, own-goal and penalty tagging (an own goal is credited to the correct team in code), cards and red cards, and full-match `match_stats` (possession, shots, on target, xG, corners). This is the ground truth the writer is handed.
2. **Opus writer.** An Anthropic Opus call (`WRITER_MODEL`, default `claude-opus-4-8`) conditioned on the `voice_corpus` persona (`style_rule` rows) and a handful of `example` lines for register only. It returns JSON: `title`, `script`, `magic_sentence`, `referenced_scorers`, `stated_score`. The brief: get the winner and final score exactly right, name only decisive goals, never credit a goal to the wrong team, 105 to 135 words.
3. **Deterministic code gate.** Every draft is checked in code: exact final score (`stated_score` equals the real scoreline), scorers are a subset of the fact-pack via diacritic-normalized surname matching, length in band, no repeated score or minute, no "scored every goal" claim when both teams scored, no em dashes, no banned cliches.
4. **Sonnet contradiction judge.** A second Anthropic call (`JUDGE_MODEL`, default `claude-sonnet-4-6`) compares the recap to the correct result and returns a verdict only. It flags a contradiction only for a wrong winner, a wrong final score, or a named goal attributed to the wrong team. It ignores phrasing and any goal the recap chooses not to mention.
5. **Up to 5 surgical regens.** On any gate or judge failure, the writer is re-prompted with the specific mechanical issues and factual errors and asked to fix only those.
6. **Fail-closed.** If a draft never passes the gate and judge within 5 attempts, `runEpisodePipeline` throws. No episode is written. The product publishes nothing rather than a wrong recap.

**LLM transport:** direct calls to `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, and a 5-try retry on 429 / 5xx.

### TTS, storage, and the episode row
**File:** `src/lib/api/episode-pipeline.functions.ts`.
**TTS:** ElevenLabs, model `eleven_multilingual_v2`, voice Daniel (`ELEVENLABS_VOICE_ID`, default `onwK4e9ZLuTAKqWW03F9`), output `mp3_44100_128`.
**Storage path:** `episodes/YYYY-MM-DD/{matchId}.mp3` (public read), uploaded with upsert.
**DB write:** `INSERT` into `episodes` with `script`, `hook`, `magic_sentence`, `segments`, `audio_url`, `duration_sec`, `badge`, `model` (`opus-4-8+gate+judge+eleven_multilingual_v2`), `status: "published"`. Uses `supabaseAdmin` (service role) imported INSIDE the handler, never at module scope (this file is reachable from the client bundle as a `*.functions.ts` module).

### Billing and entitlement (Stripe)
**Model:** Free plus "Full Time Pro" at $4.99/mo USD. Wired to Stripe account `acct_1Siiex` (an old Lockstep account repurposed). Deliberately on the Stripe TEST key, so no real charges happen yet.
**The Pro gate that actually enforces today:** pundit SELECTION. The free tier gets only the house voice ("The Reporter" / `zen`). The other five pundits (`gaffer`, `stats`, `romantic`, `doomer`, `banter`) are Pro. Enforced in three places: the UI, the server function `setVoiceStyle` (`src/lib/api/profile.functions.ts`, which rejects a Pro pundit for a non-Pro caller), and the DB. Other Pro benefits (your clubs first, all leagues, full archive) are marketed honestly as "rolling out", not yet built.

**Server functions** (`src/lib/api/billing.functions.ts`, all behind `requireSupabaseAuth`):
- `getEntitlement` reads the caller's own profile under RLS and returns `{ plan, isPro, status, currentPeriodEnd }`.
- `createCheckout` finds-or-creates the Stripe customer, then opens a subscription Checkout Session for `STRIPE_PRO_PRICE_ID`.
- `createPortal` opens the Stripe billing portal for the stored customer.
- `syncCheckout` reconciles entitlement straight from Stripe on the success page (belt and suspenders, so Pro reflects instantly even if the webhook is a beat behind).

**Webhook** (`src/routes/api/stripe/webhook.ts`): a public route whose authenticity comes from the Stripe signature (`STRIPE_WEBHOOK_SECRET`) verified against the raw body. It handles `checkout.session.completed`, `customer.subscription.*`, and `invoice.paid` / `invoice.payment_failed`, and on transient failures returns 500 so Stripe retries.

**Shared write** (`src/lib/billing-sync.server.ts`): `applySubscriptionToProfile` maps a Stripe subscription onto the profile's entitlement columns (`plan`, `subscription_status`, `stripe_subscription_id`, `stripe_customer_id`, `current_period_end`, `price_id`). Both the webhook and `syncCheckout` call it so both write entitlement identically, with the service-role client.

**Client wiring:** `src/lib/stripe.server.ts` (lazy server-only Stripe client, `getStripe` / `proPriceId`), `src/lib/entitlement.ts` (client-safe constants and `isProProfile` / `isProVoiceStyle`), `src/hooks/use-entitlement.ts` (TanStack Query over `getEntitlement`), and the `/pro` page `src/routes/pro.tsx`.

```text
   Browser (use-entitlement, /pro)
        │  createCheckout / createPortal / syncCheckout   (billing.functions.ts)
        ▼
   Stripe (acct_1Siiex, TEST key)  ── webhook ──▶  POST /api/stripe/webhook.ts
        ▲                                              │ verifies STRIPE_WEBHOOK_SECRET (raw body)
        │                                              ▼
        │                                    applySubscriptionToProfile  (billing-sync.server.ts)
        │                                              │ service-role write (only role past the guard)
        │                                              ▼
        └───────────  profiles.plan / subscription_status / current_period_end / ...
                      guarded by trigger enforce_profile_billing_guard
```

**The billing guard (real security fix).** Migration `supabase/migrations/20260705120000_billing.sql` adds the billing columns and a `BEFORE INSERT OR UPDATE` trigger `enforce_profile_billing_guard`. When `current_user` is `authenticated` or `anon`, the trigger forces the billing columns back to their prior values (or defaults on insert), so those columns are writable only by `service_role`. This closed a real self-grant-Pro RLS hole: without it, the existing "Profiles self update" policy would have let a user set their own `plan` to `pro`.

### Frontend reads and club-first ordering
**Hook:** `src/hooks/use-episodes.ts` (`useTodayFeed`).
- TanStack Query against `getTodayFeed()` (`src/lib/api/feed.functions.ts`), which returns `episodes`, `tonight`, and the `coda` (the "one thing we noticed" synthesis insight).
- Subscribes to the realtime channel on `episodes` INSERT and invalidates the query so the morning drop animates in for anyone already on the page.

**Club-first ordering** lives in `src/routes/index.tsx`: a followed club (or league) leads the drop. A stable sort reorders the feed by whether each episode's `homeTeamId` / `awayTeamId` / `leagueId` is in the local follow set, keeping published order within each group. This keeps the "your clubs first" promise. Follows are stored locally, so no auth is required.

### Player (continuous playback)
**File:** `src/lib/player-store.ts`.
- `useSyncExternalStore` over a singleton `<audio>` element.
- A queue with auto-advance: `playAll(list)` starts the whole morning drop from the top (the "Play the morning" button on Today), and each episode auto-advances to the next on `ended`, so a hands-busy listener keeps going without touching the phone.
- Wires `MediaSession` for lock-screen play / pause / seek / next / prev / artwork.
- Falls back to a timer-based simulator when `audio_url` is empty (used by seeded demo episodes).

### Push
- Subscribe: `src/lib/push-client.ts` (client) to `subscribeToPush` server fn, writing a row in `push_subscriptions`.
- Fanout: `fanoutMorningPush(count)` in `src/lib/api/push-fanout.server.ts`. Reads all subs, sends a single payload, swallows individual failures.
- Display: `public/sw.js` handles the `push` event and surfaces the notification.

### Honesty sweep (2026-07-06)
The always-on "Live drop" badge was false (the product is deliberately day-after, not live) and was replaced with a static "Daily". The Pro pundit copy is hedged to "rolling out" for the not-yet-built benefits. Pinch-zoom was restored (the viewport `maximum-scale=1` was removed).

## Data flow rules

- **Episodes are written only by the cron** (service role). Never from a client request.
- **Billing columns on `profiles` are written only by the Stripe webhook / sync** (service role, enforced by `enforce_profile_billing_guard`). A user request can never change its own `plan`.
- **Listens** can be written by anonymous device or signed-in user (see RLS in `04-data-model.md`).
- **Follows / profiles / push subs** are user-scoped, RLS-gated to `auth.uid()`.
- **`voice_corpus` is service-role only** and feeds generation; it is never read by the client.

## Deployment

- Frontend plus server functions run on **Vercel** (TanStack Start with the nitro `vercel` preset). Deploys are driven from Git, connected to the `full-time` Vercel project.
- Stable production URL: **`https://full-time-alpha.vercel.app`**. Use this for cron and external services (it is what `FULL_TIME_URL` points at).
- Current reality: the live app is deployed from the local working tree and is being merged to `main`. There are 5 hand-authored episodes live and 0 real users, listens, or follows yet.
- The daily-drop schedule is enabled by setting two GitHub repo secrets: `CRON_SECRET` (matching Vercel) and `FULL_TIME_URL`.

## Environments

| Env | Where | Used for |
|---|---|---|
| Production | `https://full-time-alpha.vercel.app` (Vercel project `full-time`) | Real users, cron target |
| Preview (per branch) | Vercel preview deployment per PR / branch | Review before merge |
| Local dev | `vite` dev server | Local development against the same Supabase project |

Supabase project (Postgres / Auth / Storage / Realtime): `hzadscrqmyilbisexvyz`.

## Failure modes (one-liners, see `06-ops.md` for runbooks)

| Symptom | Likely cause |
|---|---|
| Cron 401 | `CRON_SECRET` mismatch between the GitHub Actions secret and Vercel (or the `Authorization: Bearer` header is missing) |
| Cron runs but creates nothing | No finished matches in the last 36h with data (expected while match data is seeded and the live feed is not wired) |
| Generation throws `ANTHROPIC_API_KEY missing` | Anthropic key not synced to the runtime |
| A match is skipped with "recap failed gate/judge" | Fail-closed by design: the writer could not pass the code gate plus judge in 5 attempts, so no episode was published |
| All TTS failures | `ELEVENLABS_API_KEY` missing or over quota |
| Checkout / portal errors | `STRIPE_SECRET_KEY` or `STRIPE_PRO_PRICE_ID` missing (test key) |
| Pro not reflected after paying | Webhook not receiving events or `STRIPE_WEBHOOK_SECRET` mismatch; `/pro` success page `syncCheckout` is the fallback |
| No push delivered | VAPID keys missing or service worker not registered |
| New episode does not appear without refresh | Realtime channel not connected |
