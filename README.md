# Full Time

Daily AI-narrated football recaps. Big-5 leagues. About 60 seconds per match. One morning drop. Calm voice, sharp writing. PWA-first, optional account, optional push.

Live: https://full-time-alpha.vercel.app

Status: 5 hand-authored episodes are live and the accuracy-guaranteed generation engine has been proven end to end on production. There are no real users, listens, or follows yet. Match data is seeded (2023-24 season), so the daily cron is inert until a live match feed is wired.

## Stack

- TanStack Start v1, React 19, Vite 8, Tailwind v4, shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime), project `hzadscrqmyilbisexvyz`
- Deployed on Vercel (nitro `vercel` preset)
- Anthropic (writer + judge) and ElevenLabs (TTS) power generation
- Stripe for billing (on the test key today, so no real charges)

## How episodes are generated

Accuracy is guaranteed by construction, not by a prompt instruction. The pipeline lives in `src/lib/api/recap-generator.server.ts` and `src/lib/api/episode-pipeline.functions.ts` (`runEpisodePipeline`):

1. A deterministic fact-pack is built from `match_events`: a goal log with running score, scorer summary by team, own-goal and penalty tagging, cards, and full-match stats.
2. An Anthropic Opus writer drafts the script, conditioned on a persona and examples from `voice_corpus`.
3. A deterministic code gate checks the draft: exact final score, scorers must be a subset of the fact-pack (diacritic-normalized surname matching), 105 to 135 words, no repeated score or minute, no "scored every goal", no em dashes, no banned cliches.
4. A Sonnet contradiction judge returns a verdict only, flagging a wrong winner, a wrong score, or a goal credited to the wrong team.
5. Up to 5 surgical regens on any failure. The pipeline is fail-closed: it publishes no episode rather than a wrong one.

The approved script goes to ElevenLabs TTS (Daniel voice, `eleven_multilingual_v2`), the audio lands in Supabase Storage, and an `episodes` row is written (script, magic sentence, segments, audio URL).

Env: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, optional `WRITER_MODEL` (default `claude-opus-4-8`), `JUDGE_MODEL` (default `claude-sonnet-4-6`).

## Free and Pro

Free tier plus Full Time Pro at $4.99/mo USD, wired through Stripe. Billing runs on the Stripe test key today, so no real money moves yet.

The Pro gate that actually enforces right now is pundit selection: the free tier gets only "The Reporter" (zen); the other 5 pundits are Pro. It is enforced in the UI, in the server `setVoiceStyle`, and by a DB guard trigger. Other Pro benefits (your clubs first, all leagues, full archive) are marketed honestly as "rolling out" and are not fully built yet.

Billing code: `src/lib/api/billing.functions.ts` (`getEntitlement`, `createCheckout`, `createPortal`, `syncCheckout`), `src/routes/api/stripe/webhook.ts`, `src/lib/stripe.server.ts`, `src/lib/billing-sync.server.ts`, `src/lib/entitlement.ts`, `src/hooks/use-entitlement.ts`, and the `src/routes/pro.tsx` page.

Data: `profiles` gained `plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`, and `price_id`. A `BEFORE INSERT/UPDATE` trigger (`enforce_profile_billing_guard`) makes those billing columns writable by `service_role` only, which closed a real self-grant-Pro RLS hole. See `supabase/migrations/20260705120000_billing.sql`.

Env: `STRIPE_SECRET_KEY` (test), `STRIPE_PRO_PRICE_ID` (test), `STRIPE_WEBHOOK_SECRET`.

## Daily drop

The morning batch is a single endpoint, `src/routes/api/public/cron/daily-drop` (file `src/routes/api/public/cron.daily-drop.ts`), triggered by GitHub Actions (`.github/workflows/daily-drop.yml`) at 06:30 UTC.

- Auth: it requires a `CRON_SECRET` bearer token (previously it trusted the public Supabase publishable key, which was a weakness).
- Scale: generation is heavy, so matches run with bounded concurrency (3) under a 240s wall-clock budget to stay inside the 300s serverless function limit.
- Safety: it is idempotent, skipping any match that already has an episode, and date-filtered to recent finished matches.

It is inert until a live match-data feed exists. Turning on real daily content needs a live API-Football ingest (roadmap) and accepts ongoing Anthropic and ElevenLabs cost. To activate the schedule, the operator sets two GitHub repo secrets: `CRON_SECRET` (matching Vercel) and `FULL_TIME_URL`.

## Local dev

```bash
bun install
bun run dev
```

The app runs at the local URL Vite prints. `.env` holds the Supabase project vars; the generation, billing, and cron features need their own keys (see the sections above) to run fully.

## Documentation

Full operating documentation lives in [`docs/`](./docs/README.md), written for the specific role an AI agent or human might step into. Some role docs predate the 2026-07-06 monetization and generation-engine changes; this README is the current source of truth for those two areas until the role docs catch up.

| If you are… | Start here |
|---|---|
| Picking this codebase up cold | [`docs/13-agent-handoff.md`](./docs/13-agent-handoff.md) |
| Shipping code | [`docs/02-developer.md`](./docs/02-developer.md) |
| Reading or writing the database | [`docs/04-data-model.md`](./docs/04-data-model.md) |
| Touching the AI pipeline | [`docs/05-content-safety.md`](./docs/05-content-safety.md) |
| Designing or applying brand | [`docs/01-brand.md`](./docs/01-brand.md) |
| Running ops / on-call | [`docs/06-ops.md`](./docs/06-ops.md) |
| Marketing or launch | [`docs/07-marketing.md`](./docs/07-marketing.md) |
| Sales or partnerships | [`docs/08-sales.md`](./docs/08-sales.md) |
| Growth experiments | [`docs/09-growth.md`](./docs/09-growth.md) |
| Product or roadmap | [`docs/00-product.md`](./docs/00-product.md), [`docs/12-roadmap.md`](./docs/12-roadmap.md) |
| Support escalations | [`docs/10-support.md`](./docs/10-support.md) |
| Legal review | [`docs/11-legal.md`](./docs/11-legal.md) |
