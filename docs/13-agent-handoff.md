# 13 · Agent Handoff

**Role:** Any AI agent picking this codebase up cold.
**Read this when:** the very first turn you work on Full Time.
**Don't read this when:** you've already been working on this project this session.

---

## What this project is

Full Time is a daily AI-narrated football recap app. One paragraph: each morning we generate ~60-second audio recaps for the Big-5 leagues' previous-day matches, serve them as a tap-once PWA, and (when push is configured) fan them out to subscribers. It is deliberately day-after, not live. Calm voice, sharp writing.

Long form: `00-product.md`.

## What's already built

Most of it, and it is LIVE at https://full-time-alpha.vercel.app (Vercel, nitro vercel preset). Right now the app is deployed from the local working tree and is being merged to main. Reality check: 5 hand-authored episodes are live, and there are 0 real users, listens, or follows yet.

- **Backend.** Supabase project `hzadscrqmyilbisexvyz`: 15 public tables with RLS on all, magic-link auth, realtime, Storage (`episodes` + `share` buckets).
- **Generation engine (the real work).** `src/lib/api/recap-generator.server.ts` + `runEpisodePipeline` in `src/lib/api/episode-pipeline.functions.ts`. A DETERMINISTIC fact-pack is built from `match_events` (goal log with running score, per-team scorer summary, own-goal and penalty tagging, cards, full-match stats). An Anthropic Opus writer, conditioned on the `voice_corpus` persona and examples, drafts the recap. A DETERMINISTIC CODE GATE checks it (exact final score, scorers are a subset of the fact-pack via diacritic-normalised surname matching, 105 to 135 words, no repeated score or minute, no "scored every goal", no em dashes, no banned cliches). A Sonnet CONTRADICTION JUDGE then flags only a wrong winner, wrong score, or a goal credited to the wrong team. Up to 5 surgical regens. It is FAIL-CLOSED: it publishes no episode rather than a wrong one. Accuracy is guaranteed BY CONSTRUCTION, not by a prompt instruction. Then ElevenLabs TTS (Daniel voice, `eleven_multilingual_v2`) to Supabase Storage to an `episodes` row. Proven end-to-end on production.
- **Billing + Pro.** Free plus "Full Time Pro" at $4.99/mo, wired via Stripe on a TEST key (no real charges yet). The Pro gate that actually enforces today is pundit SELECTION: free gets only "The Reporter" (zen); the other 5 pundits are Pro, enforced in the UI, in the server `setVoiceStyle`, and by a DB guard trigger. Other Pro benefits (your clubs first, all leagues, full archive) are marketed honestly as "rolling out", not yet built. Files: `src/lib/api/billing.functions.ts`, `src/routes/api/stripe/webhook.ts`, `src/lib/stripe.server.ts`, `src/lib/billing-sync.server.ts`, `src/lib/entitlement.ts`, `src/hooks/use-entitlement.ts`, `src/routes/pro.tsx`.
- **Daily drop cron.** `src/routes/api/public/cron.daily-drop.ts`, scheduled by GitHub Actions (`.github/workflows/daily-drop.yml`, 06:30 UTC). Requires a `CRON_SECRET` bearer token (a legacy Supabase-publishable-key fallback exists only when no secret is set), runs generation with bounded concurrency (3) under a 240s wall-clock budget to stay inside the 300s function limit, and is idempotent (skips matches that already have an episode).
- **UX.** Club-first feed ordering (a followed club leads the drop), continuous playback (player-store queue, auto-advance, "Play the morning" on Today, MediaSession next/prev), magic-link auth, follows, voice preference, web push (client + fanout), PWA, Plausible, full brand system, full docs.

## First-turn checklist for any agent

1. **Read the role you're operating in.**
   - Writing code? → `02-developer.md` + `01-brand.md`.
   - Designing? → `01-brand.md`.
   - Ops issue? → `06-ops.md`.
   - Talking to a user? → `10-support.md`.
   - Asked about money / partnerships? → `08-sales.md` / `11-legal.md`.

2. **Don't reintroduce these mistakes** (each cost us a turn earlier):
   - Hardcoded colours like `text-white`, `bg-[#0a0a0c]`. Use tokens.
   - `@import` of a URL in `styles.css`. Use a `<link>` in `__root.tsx`.
   - Service-role import at module scope of a `.functions.ts` file. Import inside the handler.
   - Creating `src/pages/` or `app/`. We use TanStack file-based routing in `src/routes/`.
   - Calling a `requireSupabaseAuth` server fn from a public-route loader. Use a component + `useServerFn`.
   - Re-adding mock reads in components. Read from the DB via `useTodayFeed`.
   - Resurrecting the old Lovable AI Gateway path (Gemini 3 Flash + a single banned-words regex). It was fact-starved and non-functional. The engine is now the deterministic fact-pack → Opus writer → code gate → Sonnet judge → fail-closed pipeline. Do not swap it back for a single prompt-instruction generator.
   - Writing to the `profiles` billing columns (`plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`, `price_id`) from client or user context. They are service_role-only, enforced by the `enforce_profile_billing_guard` trigger, which closed a real self-grant-Pro RLS hole. Never widen that.

3. **Use the docs as the contract**:
   - Brand decisions ≠ vibe, `01-brand.md` is law.
   - Banned terms / system prompt, `05-content-safety.md` is law.
   - Decision log lives in `12-roadmap.md`, log new decisions there.

4. **When in doubt about scope**, look at:
   - The roadmap (`12-roadmap.md`) for what's in / out.
   - The "Explicitly NOT doing" table, those are rejected with reasons.

## What's gated on secrets and a live feed

- **Keys that ARE set:** `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`), and the Stripe keys (`STRIPE_SECRET_KEY` test, `STRIPE_PRO_PRICE_ID` test, `STRIPE_WEBHOOK_SECRET`). Generation, TTS, and the Pro checkout flow all run.
- **The remaining gate is a live match-data feed.** Current match data is seeded (2023-24 season), and the cron is date-filtered to recent finished matches, so it is INERT until a live API-Football ingest exists (roadmap). Enabling real daily content also accepts ongoing Anthropic plus ElevenLabs cost.
- **To activate the schedule,** set two GitHub repo secrets: `CRON_SECRET` (matching Vercel) and `FULL_TIME_URL`.
- **Push fan-out** stays off until VAPID keys are set; it is a non-fatal step in the cron.

## Cheat sheet: where things live

```
src/styles.css                                design tokens (the brand is here)
src/components/AppHeader.tsx                   wordmark + lime hairline on every route
src/components/AudioCard.tsx                   hero & carousel cards
src/lib/api/recap-generator.server.ts          Opus writer + deterministic code gate + Sonnet judge
src/lib/api/episode-pipeline.functions.ts      runEpisodePipeline: fact-pack -> recap -> TTS -> Storage -> row
src/lib/api/billing.functions.ts               entitlement + Stripe checkout / portal / sync
src/routes/api/stripe/webhook.ts               Stripe webhook -> profile billing sync
src/lib/entitlement.ts                         client-safe Pro gate (voice styles, isProProfile)
src/routes/pro.tsx                             the Pro upgrade page
src/routes/api/public/cron.daily-drop.ts       the daily-drop cron endpoint
supabase/migrations/                           DB schema (base 3 + magic_engine_extensions + billing)
docs/                                          you are here
```

## Things that look weird but are deliberate

- The pipeline is FAIL-CLOSED. If the code gate or the Sonnet judge rejects all 5 attempts, we publish NO episode for that match instead of a wrong one. A missing recap is correct behaviour, not a bug.
- The feed badge says "Daily", not "Live". The product is deliberately day-after. Don't re-add an always-on "Live drop" badge.
- Free tier gets one pundit, "The Reporter" (zen). The other 5 are Pro, enforced in the UI, in the server `setVoiceStyle`, and by a DB trigger. Don't ungate them client-side.
- The mini-player progress bar is 2px and lime. It's the only persistently visible lime element. Don't thicken it.
- BottomNav active state is a 2px underline, not a filled pill. We're broadcast tool, not consumer fluff.
- The hero card shows the score in mono, with the away score muted. That's the editorial hierarchy, home is "the protagonist" of the line.
- `public/sw.js` is push-only, not an app-shell cache. Don't add caching to it.
- We ship a lot of `text-mono` for numbers. That's intentional. Don't convert them to the body font.

## What earns you a high-five

- A change ships without touching colours or fonts directly in components.
- New routes set proper `head()` metadata (title, description, og:title, og:url, canonical).
- New server functions live in `*.functions.ts` and import `supabaseAdmin` inside the handler.
- New tables come with `GRANT` + `ENABLE RLS` + `CREATE POLICY` in the same migration.
- The decision log gets a new entry when you make a real choice.

Welcome to Full Time. Read the role file. Then ship.
