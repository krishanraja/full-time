# 19 - Release state

- **Status:** Current release source of truth
- **Owner:** Founder and release operator
- **Purpose:** Record what is live, what is disabled, what remains inconsistent, and what must happen next.
- **Last verified:** 2026-09-04

## Live readback

At 2026-09-04 20:50 UTC, before this revision deployed:

- `https://fulltime.fm` served the player-first Today shell with the "Nothing ready just yet" empty state.
- Supabase `hzadscrqmyilbisexvyz` held 225 `matches` rows (90 for season 2026, 84 finished in the last 14 days, latest coverage date 2026-09-03), 2,904 `match_events`, 169 `match_stats`, 122 `h2h_cache`, 2,252 `players`. The 00:15 UTC ingest is healthy; the coverage-preflight failure recorded on 2026-08-11 no longer occurs.
- `editorial_runs`, `rehearsal_runs`, `harness_runs`, `evidence_packs`, `daily_drops`, `pundit_variants`, `voice_candidates`, `pronunciation_lexicon` were all empty. The six-variant workflow had never been admitted past its flag check.
- Vercel deployment `dpl_FMwDiq4sqwioGfAR3KHrh6rqsGYv` logged `GET /api/internal/daily-rehearsal 409` at 04:45 UTC: `ENABLE_PRIVATE_REHEARSALS` was not `true` while `PRELAUNCH_MODE` was on.
- `release_state.public_launch_enabled` was `false` with no gate snapshot, so `publish_daily_drop()` would have refused every drop.

## Founder launch override, 2026-09-04

The founder decided to launch publicly before the external launch gates are met. Migration `20260904120000_founder_launch_override.sql` records an explicit `release_gate_runs` snapshot (`revision = founder-override-2026-09-04`, `override = true`, waived gates listed on the row) and sets `release_state` to `live` with `public_launch_enabled = true`.

Waived by that snapshot: evaluation manifest and scripts, hard-gate evaluation approval, founder gold and humour samples, voice auditions and licensing review, forecast backtest and calibration, seven consecutive rehearsals, prediction receipts, the nine revision-bound sign-offs, research rights review, the 1.5 million character TTS floor, TTS alerting, and the pre-launch truthfulness gate.

Still enforced on every drop by `publish_daily_drop()` and the workflow: sealed evidence and licensed claims, the 25 required harnesses per AI Pundit, distinct audio and a distinct licensed voice per published edition, transcript fidelity, script identity, loudness, true peak, speaking rate, five to eight minute duration, a measured 99 percent proper-name rate, share cards, asset reachability, and immutability after publication. Every one of those is a per-edition condition. From 2026-09-05 a drop publishes the editions that met them, and withholds the ones that did not, rather than withholding all six because one fell short.

Code changes in the same revision:

- `src/lib/pundit/pronunciation.server.ts`: the selected voice per AI Pundit is self-seeded from the configured `ELEVENLABS_VOICE_*` value with a founder attestation on the `voice_candidates` row; missing human lexicon entries no longer block narration.
- `src/lib/pundit/variant-production.server.ts`: proper-name verification is measured against the verified transcript.
- `src/lib/api/narration.server.ts`: the monthly character floor is `TTS_MONTHLY_CHARACTER_CAPACITY` (optional); the three-take retry reserve still applies.
- `src/components/TodayShowPlayer.tsx`: the empty state distinguishes no published show yet, an off day, and an edition that failed its checks.

## Current state

| Item                            | Verified state                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Product                         | AI-native, player-first, live beta                                                |
| Production URL                  | [fulltime.fm](https://fulltime.fm)                                                |
| Production branch               | `main`                                                                            |
| Public navigation               | Today, Teams, Settings                                                            |
| Today metadata                  | Six AI Pundits, one real match                                                    |
| Public launch                   | Enabled by founder override once the migration is applied                         |
| Automated publication           | Enabled once `PRELAUNCH_MODE=false` and `PUNDIT_PUBLICATION_ENABLED=true` are set |
| New checkout and paid promotion | Disabled                                                                          |
| AI Pundits                      | Six, free, selectable                                                             |
| Reporter RSS                    | Retained                                                                          |
| `/feed` page                    | Redirects to Today                                                                |
| Supabase project                | `hzadscrqmyilbisexvyz`                                                            |
| Release migrations              | Applied through 2026-08-09; override migration pending apply                      |
| First published drop            | None yet; expected after the first passing publication run                        |

Durable docs do not pin a deployment ID or SHA because committing that value immediately creates a newer revision. Deployment metadata and live readback remain authoritative.

## What is complete in code

1. Player-first Today with date, title, hook, AI Pundit picker, play or pause, seek, real-media progress, and honest loading, empty, error, and fallback states.
2. Transactional AI Pundit switching with load-before-commit, restart from zero, play or pause intent preservation, saved preference after success, old-edition retention on failure, and retry.
3. Same-AI-Pundit latest fallback, match and team identifiers, recent editions, and up to three proof cards from sealed evidence and licensed claims.
4. Six abstract AI Pundit motifs with deterministic per-edition variation.
5. Three-tab navigation and `/feed` redirect.
6. Immutable evidence, licensed claims, six internal AI Pundit specs, independent gates, targeted repair, and quarantine.
7. Performance plans, transcript and number identity, pronunciation controls, mastering, share cards, and content-addressed storage.
8. Durable orchestration, bounded parallel production, promise checks, and atomic publication.
9. Forecast backtesting, pre-kickoff registration, settlement, and public API controls.
10. Evaluation, human-review, rehearsal, and revision-bound readiness records.
11. Private text-file research intake with rights attestation, hashes, quarantine, and fail-closed audit.

## Product gaps that remain in code

These are implementation facts, not external launch gates:

- **Teams beta:** `/following` still returns all stored leagues and teams, puts teams above leagues, and retains the old three-team prompt. Premier-League-only availability and coming-later states are not complete.
- **Track record:** Today checks a settled-only endpoint, but `/receipts` still renders the legacy searchable prediction ledger and calls the broader predictions endpoint.
- **Settings language:** functional but not fully reconciled to AI Pundit terminology and the simplified public voice.
- **Personalization:** saved follows exist; a private club-built playlist does not.
- **Machine-facing copy:** `/llms.txt` is stale in the currently observed deployment until this revision deploys.
- **Local build limitation:** the 2026-08-11 Windows build emitted client, SSR, and Nitro bundles under Node 24.19.0, but Workflow registered zero steps and zero workflows. The manifest checker failed as designed. GitHub Actions run `31533126034` passed the same production gate on Ubuntu and Node 24 for merge `0933a63`; use Linux CI or a matching Vercel build as build authority.

No marketing, support, sales, or agent output may claim those gaps are complete.

## External and human gates

These gates were waived by the founder override on 2026-09-04 and remain open work, not launch blockers:

- rights-cleared research sources and approved original concepts;
- two commercially usable full-length voice candidates per AI Pundit;
- founder humour, editorial, and voice approval;
- TTS capacity alerts;
- two seasons of provider history and a held-out forecast win over league base rates;
- 60 approved evaluation matches, 360 passing scripts, and blind-review thresholds;
- full-length human audio review;
- seven consecutive on-time six-variant rehearsals;
- revision-bound legal, privacy, accessibility, monitoring, rollback, feed, and operational sign-offs.

No public material may claim any of these were completed. The API-Football Pro plan confirmed on 2026-08-11 is working: the ingest has populated fixtures, events, statistics, lineups, and head-to-head data daily through 2026-09-03.

## Go-live sequence

1. Apply `20260904120000_founder_launch_override.sql` to `hzadscrqmyilbisexvyz` and read back `release_state` (`status = live`, `public_launch_enabled = true`, `verified_revision = founder-override-2026-09-04`).
2. Deploy this revision to production.
3. Set Vercel production env: `PRELAUNCH_MODE=false`, `VITE_PRELAUNCH_MODE=false`, `PUNDIT_PUBLICATION_ENABLED=true`. Keep `BILLING_ENABLED`, `VITE_BILLING_ENABLED`, `ENABLE_PREDICTION_REGISTRATION`, `ENABLE_EVALUATION_RUNS`, `ENABLE_FORECAST_TRAINING`, `PUBLIC_FORECAST_SCORES_ENABLED` false. Confirm `CRON_SECRET`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, and all six `ELEVENLABS_VOICE_*` values are present. Redeploy.
4. Trigger `POST /api/internal/daily-rehearsal?date=<latest coverage date with finished matches>` with the cron bearer, or run the manual GitHub recovery workflow. Expect HTTP 202 and a `runId`.
5. Follow the run: `editorial_runs.failure`, `harness_runs` where `passed = false`, `pundit_variants.audio_quality`, `daily_drops.promise_checks`. Fix the named gate input and rerun with the next date until `daily_drops.status = published`.
6. Read back fulltime.fm in a private window: the show plays, `/api/public/feed.rss` lists it, and the header no longer says Pre-launch.
7. Leave the 04:45 UTC cron to publish daily. A day whose drop fails any automated check stays unpublished and Today keeps the latest published edition.

## Next product sequence

1. Finish Premier-League-only Teams behavior and preserve old non-Premier-League follows outside beta counts and promises.
2. Replace `/receipts` with the quiet settled-only **How did they do?** experience and deep links.
3. Finish the Settings language pass using AI Pundit and plain, playful copy.
4. Verify `llms.txt`, sitemap, metadata, legal copy, and public routes against the matching deployment.
5. Backfill two seasons in bounded batches.
6. Work the waived gates above in order of listener impact: voice review, humour review, legal and privacy sign-off, then evaluation and forecast evidence.

## Vercel operator note

The Vercel CLI is not installed in the current workspace. Install it only for an approved environment, preview, deployment, or log task:

```powershell
npm i -g vercel
```

Pulling environment values, deploying a preview, and promoting production are separate actions. Never print or commit a secret.

## Rollback

- Promote the last known-good Vercel deployment.
- Set release state to `paused` and turn publication flags off.
- Stop writers before data changes.
- Preserve additive schema, audit history, content-addressed assets, registered claims, and settled records.
- Show an AI Pundit failure; never substitute another one.

## Verification baseline

```powershell
pnpm run docs:check
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

Passing checks proves repository integrity only. Live parity needs matching-revision readback. The waived external and human gates remain open work after launch.
