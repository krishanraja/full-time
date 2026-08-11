# 19 - Release state

- **Status:** Current release source of truth
- **Owner:** Founder and release operator
- **Purpose:** Record what is live, what is disabled, what remains inconsistent, and what must happen next.
- **Last verified:** 2026-08-11

## Live readback

At 2026-08-11 19:53 UTC, `https://fulltime.fm` returned HTTP 200 from Vercel and served:

- title: `Full Time - Six AI Pundits, one real match`;
- description: `Pick an AI Pundit and play a complete football show built from checked match facts.`;
- desktop and mobile navigation: Today, Teams, Settings;
- pre-launch state;
- the player-first Today application bundle.

`https://fulltime.fm/llms.txt` still served the legacy "Big Five leagues, about 60 seconds each" description at that readback. This documentation reconciliation corrects the route source. The correction is not live until the matching revision deploys and the endpoint is read back again.

## Current state

| Item                            | Verified state                                  |
| ------------------------------- | ----------------------------------------------- |
| Product                         | AI-native, player-first, fail-closed pre-launch |
| Production URL                  | [fulltime.fm](https://fulltime.fm)              |
| Production branch               | `main`                                          |
| Public navigation               | Today, Teams, Settings                          |
| Today metadata                  | Six AI Pundits, one real match                  |
| Public launch                   | Disabled                                        |
| Automated publication           | Disabled                                        |
| New checkout and paid promotion | Disabled                                        |
| AI Pundits                      | Six, free, selectable                           |
| Reporter RSS                    | Retained                                        |
| `/feed` page                    | Redirects to Today                              |
| Supabase project                | `hzadscrqmyilbisexvyz`                          |
| Release migrations              | Previously applied and read back on 2026-08-08  |

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
- **Production build gate:** the 2026-08-11 local Windows build emitted client, SSR, and Nitro bundles under Node 24.19.0, but Workflow registered zero steps and zero workflows. The manifest checker failed as designed. Reproduce on Linux CI or repair the Workflow/Vite integration before release.

No marketing, support, sales, or agent output may claim those gaps are complete.

## External and human gates

Public launch remains blocked by:

- rights-cleared research sources and approved original concepts;
- two commercially usable full-length voice candidates per AI Pundit;
- founder humour, editorial, and voice approval;
- at least 1.5 million approved TTS characters per month with alerts;
- two seasons of provider history and a held-out forecast win over league base rates;
- 60 approved evaluation matches, 360 passing scripts, and blind-review thresholds;
- full-length audio review and 99% verified launch-name pronunciation;
- seven consecutive on-time six-variant rehearsals;
- revision-bound legal, privacy, accessibility, monitoring, rollback, feed, and operational sign-offs.

The founder confirmed an API-Football Pro plan with all endpoints and 7,500 daily requests on 2026-08-11. The 00:15 UTC ingest still failed its 2026 coverage preflight because the configured leagues did not report live fixture-event coverage. Investigate season mapping, key mapping, and provider response. Do not infer a missing paid tier or bypass the gate.

## Next product sequence

1. Finish Premier-League-only Teams behavior and preserve old non-Premier-League follows outside beta counts and promises.
2. Replace `/receipts` with the quiet settled-only **How did they do?** experience and deep links.
3. Finish the Settings language pass using AI Pundit and plain, playful copy.
4. Verify `llms.txt`, sitemap, metadata, legal copy, and public routes against the matching deployment.
5. Reconcile the provider coverage response, then backfill two seasons in bounded batches.
6. Complete editorial, voice, rehearsal, rights, legal, accessibility, and release evidence.

## Operator sequence

1. Confirm Vercel and Supabase target identity before touching live state.
2. Keep all execution and billing flags false during investigation.
3. Run local documentation and repository checks on Node 24, and require the Workflow manifest to contain `dailyPunditWorkflow` plus all ten application steps.
4. Verify a preview at 320, 393, tablet, desktop, Android Chrome, and iOS Safari.
5. Read back Today, Teams, Settings, `/feed`, `/receipts`, `/llms.txt`, RSS, sitemap, legal pages, and failure states from the exact deployed revision.
6. Store a release snapshot only after every required gate passes.
7. Treat public launch and billing as separate later mutations.

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

Passing checks proves repository integrity only. Live parity needs matching-revision readback. Launch needs every external and human gate.
