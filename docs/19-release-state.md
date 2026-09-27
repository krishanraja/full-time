# 19 - Release state

- **Status:** Current release source of truth
- **Owner:** Founder and release operator
- **Purpose:** Record what is live, what is disabled, what remains inconsistent, and what must happen next.
- **Last verified:** 2026-09-27

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

## Premier League only, one match, no scroll, 2026-09-27

Four rulings (Krish, 2026-09-27), recorded in the [roadmap decision log](./12-roadmap.md): Premier League teams only, across the product; Today shows one match, says which game it is, and carries one novelty element; the app is a completely no-scroll experience; club crests are shown from the provider's public imagery, accepting the trademark exposure. The Premier League's own mark is not used.

- `selectFeatureMatch` (`src/lib/pundit/daily-orchestrator.server.ts`) picks only a finished Premier League match (`af_39`, from `src/lib/premier-league.ts`). A day without one fails selection before any paid step. The operator `?matchId=` override still bypasses selection. The ingest and prediction sync pull the Premier League only.
- `/following` shows the twenty clubs of the current Premier League season from `getPremierLeagueClubs` (`src/lib/api/feed.functions.ts`). The query was run read-only against production and returned exactly 20. Old follows stay stored and out of the count.
- `GET /api/public/drops/today` returns `matches`, the Premier League matches with a published show, newest first by coverage date, at most eight; `recent` is gone. The 2026-08-31 La Liga edition stays published in the database and no longer reaches Today.
- The header's "Pre-launch" chip was hard-coded, read no flag, and stayed on screen after the 2026-09-04 override. It was removed in code (`src/components/AppHeader.tsx`).
- Checked locally on 2026-09-27: typecheck, 441 tests across 40 files, lint with zero errors and the six existing warnings, and the production build with the workflow manifest verified. Playwright measured zero document scroll and zero screen-region overflow on Today, Teams, Settings, and Teams with the mini player at 412x765, 390x664, 375x548, and 1280x800. The deployment carrying the change has not been read back. Model spend: $0.

## Current state

| Item                            | Verified state                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Product                         | AI-native, player-first, live beta                                                |
| Production URL                  | [fulltime.fm](https://fulltime.fm)                                                |
| Production branch               | `main`                                                                            |
| Public navigation               | Today, Teams, Settings                                                            |
| Today metadata                  | Six AI Pundits, one real match                                                    |
| Public launch                   | Enabled by founder override; migration applied and read back as live on 2026-09-04 (`product-state.json`) |
| Automated publication           | Per edition since 2026-09-05 (`publish_daily_drop()`); needs `PRELAUNCH_MODE=false` and `PUNDIT_PUBLICATION_ENABLED=true` in production |
| New checkout and paid promotion | Disabled                                                                          |
| AI Pundits                      | Six, free, selectable                                                             |
| Reporter RSS                    | Retained                                                                          |
| `/feed` page                    | Redirects to Today                                                                |
| Supabase project                | `hzadscrqmyilbisexvyz`                                                            |
| Release migrations              | Applied through `20260905060000` per commit records `ce44014` and `d4bc163`; `20260905080000` reflected in the regenerated types (`c0e2ed8`) |
| First published drop            | One edition (The Romantic) published 2026-09-05 per commits `407be64` and `5ed4712`; later drops are a database fact, not a repository one |

Durable docs do not pin a deployment ID or SHA because committing that value immediately creates a newer revision. Deployment metadata and live readback remain authoritative.

The table above was reconciled against the repository record at `adddf64` on 2026-09-07 by the docs steward. The live readback section is still the 2026-09-04 reading; nothing in the repository can confirm the production environment after that.

## What is complete in code

1. One-match Today: competition and date with earlier and later match steps, a scoreboard with club crests and the score, the six AI Pundits as a rail, play or pause, seek, real-media progress, and honest loading, empty, error, and fallback states.
2. Transactional AI Pundit and match switching with load-before-commit, restart from zero, play or pause intent preservation, saved preference after success, old-edition retention on failure, and retry.
3. A Premier League match list newest first by coverage date, the requested AI Pundit's edition else the canonical one, match and team identifiers, and up to three proof cards from a deterministically chosen sealed evidence pack and licensed claims.
4. Six abstract AI Pundit motifs with deterministic per-edition variation.
5. Three-tab navigation, `/feed` redirect, and a no-scroll full-height frame for Today, Teams, and Settings.
6. Immutable evidence, licensed claims, six internal AI Pundit specs, independent gates, targeted repair, and quarantine.
7. Performance plans, transcript and number identity, pronunciation controls, mastering, share cards, and content-addressed storage.
8. Durable orchestration, bounded parallel production, promise checks, and atomic publication.
9. Forecast backtesting, pre-kickoff registration, settlement, and public API controls.
10. Evaluation, human-review, rehearsal, and revision-bound readiness records.
11. Private text-file research intake with rights attestation, hashes, quarantine, and fail-closed audit.
12. Premier League only Teams: the twenty current-season clubs with crests, no league rows, and old follows kept outside the count.
13. Settings as one card of rows in AI Pundit language, with the AI disclosure kept.

## Product gaps that remain in code

These are implementation facts, not external launch gates:

- **Track record:** `/receipts` has no in-app entry since Today's entry was removed on 2026-09-27, and the route still renders the legacy searchable prediction ledger and calls the broader predictions endpoint.
- **Legacy routes:** `/receipts`, `/archive`, `/episode/:id`, `/pro`, `/waitlist`, and the legal pages were not re-laid-out for the no-scroll frame and scroll inside the screen region.
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

The commit record shows steps 1 to 5 completed by 2026-09-05: the override migration applied (`product-state.json`), production running with prelaunch off (`407be64`), and one edition published. Step 6 is not verifiable from the repository. Step 7 is the standing posture.

1. Apply `20260904120000_founder_launch_override.sql` to `hzadscrqmyilbisexvyz` and read back `release_state` (`status = live`, `public_launch_enabled = true`, `verified_revision = founder-override-2026-09-04`).
2. Deploy this revision to production.
3. Set Vercel production env: `PRELAUNCH_MODE=false`, `VITE_PRELAUNCH_MODE=false`, `PUNDIT_PUBLICATION_ENABLED=true`. Keep `BILLING_ENABLED`, `VITE_BILLING_ENABLED`, `ENABLE_PREDICTION_REGISTRATION`, `ENABLE_EVALUATION_RUNS`, `ENABLE_FORECAST_TRAINING`, `PUBLIC_FORECAST_SCORES_ENABLED` false. Confirm `CRON_SECRET`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, and all six `ELEVENLABS_VOICE_*` values are present. Redeploy.
4. Trigger `POST /api/internal/daily-rehearsal?date=<latest coverage date with finished matches>` with the cron bearer, or run the manual GitHub recovery workflow. Expect HTTP 202 and a `runId`.
5. Follow the run: `editorial_runs.failure`, `harness_runs` where `passed = false`, `pundit_variants.audio_quality`, `daily_drops.promise_checks`. Fix the named gate input and rerun with the next date until `daily_drops.status = published`.
6. Read back fulltime.fm in a private window: the show plays, `/api/public/feed.rss` lists it, and the header no longer says Pre-launch. That chip was hard-coded and read no flag, so no environment change could clear it; it was removed in code on 2026-09-27.
7. Leave the 04:45 UTC cron to publish daily. A day whose drop fails any automated check stays unpublished and Today keeps the latest published edition.

## Next product sequence

1. Read back the 2026-09-27 change on the matching deployment: twenty clubs on Teams, one Premier League match on Today, and no document scroll at phone sizes.
2. Replace `/receipts` with the quiet settled-only **How did they do?** experience and deep links, and give it an entry in the product.
3. Verify `llms.txt`, sitemap, metadata, legal copy, and public routes against the matching deployment.
4. Backfill two seasons in bounded batches.
5. Work the waived gates above in order of listener impact: voice review, humour review, legal and privacy sign-off, then evaluation and forecast evidence.

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
