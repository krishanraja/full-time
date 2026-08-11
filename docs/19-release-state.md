# 19 - Release state

- **Status:** Current release source of truth
- **Owner:** Founder and release operator
- **Purpose:** Record what is live, what is disabled, and what must happen next.
- **Last verified:** 2026-08-10

## Live state

| Item                           | Verified state                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Product                        | Fail-closed pre-launch                                                                             |
| Production URL                 | [fulltime.fm](https://fulltime.fm)                                                                 |
| Vercel production              | [fulltime.fm](https://fulltime.fm), `READY`, deployed from GitHub `main`, last verified 2026-08-11 |
| Deployed revision              | Read from current Vercel deployment metadata at release time                                       |
| Production branch              | `main`                                                                                             |
| Public launch                  | Disabled                                                                                           |
| Public publication automation  | Disabled                                                                                           |
| New checkout and Pro marketing | Disabled                                                                                           |
| Pundits                        | Six, free and selectable                                                                           |
| Supabase project               | `hzadscrqmyilbisexvyz`                                                                             |
| Release migrations             | Applied and independently read back on 2026-08-08                                                  |

Vercel confirmed that `fulltime.fm` is ready and deployed from GitHub `main`. Current deployment metadata is authoritative. Durable repository docs intentionally do not pin a deployment ID or SHA because committing that update would immediately create a newer revision. This is an engineering release in truthful preview mode, not product launch approval.

The Supabase connector available in this environment does not have permission to inspect the FullTime project. That is a tooling limitation, not a reason to target another project. Confirm the project name and reference before every future production write.

## What is complete

1. Truthful pre-launch behavior, six free pundits, current-date semantics, real audio events, strict cron authorization, and no simulated completion.
2. Immutable evidence, licensed claims, six pundit specs, independent gates, targeted repair, and quarantine.
3. Performance plans, strict transcript and number identity, pronunciation licensing, mastering, share cards, and content-addressed storage.
4. Atomic run claims, 14-step durable orchestration, parallel variant fan-out, authenticated status, promise checks, and atomic publication.
5. History backfill tooling, forecast backtesting, active-model control, prediction registration, settlement, and public receipts.
6. Deterministic 60-match corpus tooling, resumable 360-script evaluation, human-review records, and revision-bound readiness evaluation.
7. Responsive product shell, pundit selection, daily-show presentation, archive labeling, and searchable receipt ledger.
8. Production schema, function search-path fixes, optimized auth RLS policies, and a ready Vercel deployment.

## What remains blocked

These gates require external evidence or founder judgment:

- rights-cleared research whitelist and approved concept cards;
- two licensed full-length voice candidates per pundit;
- founder humour, editorial, and voice approval;
- TTS capacity of at least 1.5 million approved characters per month with alerts;
- two-season data backfill and a held-out forecast win over league base rates;
- 60 approved evaluation matches, 360 passing scripts, and blind review thresholds;
- full-length audio panels for persona, pronunciation, authority, naturalness, timing, and listenability;
- seven consecutive on-time six-variant rehearsals;
- legal, privacy, accessibility, monitoring, rollback, and feed-validation sign-offs tied to the release revision.

The release-readiness evaluator lists every missing gate. It cannot average failures away or store a passing snapshot unless every requirement passes.

## Next operator sequence

1. Confirm the intended Vercel project and Supabase project before touching live state.
2. Configure provider credentials while leaving all execution flags false.
3. Backfill two seasons in bounded batches. Train a forecast without activation; activate only a held-out winner.
4. Curate the 60-match set, run 360 scripts, and collect blinded editorial review.
5. Add licensed voice candidates, verified pronunciations, and full-length audio reviews.
6. Enable private rehearsals only. Complete seven consecutive runs before the UK deadline.
7. Record every sign-off against the exact Git revision.
8. Run the release-readiness endpoint and store a snapshot only for a passing revision.
9. Verify a preview across browser, accessibility, feed, audio, assets, and receipts.
10. Roll out production deliberately. Public launch and billing are two later, separate mutations.

## Vercel operator note

The repository does not assume the Vercel CLI is installed. Install it when local environment, deployment, or log workflows require it:

```powershell
npm i -g vercel
vercel link
vercel env pull .env.local
```

Do not pull secrets merely to inspect them. Prefer process-scoped injection or platform tooling, and never print or commit a value.

## Rollback

- Application: promote the last known-good Vercel deployment.
- Editorial: set release state to `paused` and disable publication flags.
- Data: stop writers; do not drop additive tables during an incident.
- Assets: preserve content-addressed files and immutable predictions and receipts.
- Persona failure: show the failure. Never substitute another persona silently.

## Verification baseline

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

Passing code checks proves engineering integrity only. It does not satisfy human, rights, provider, rehearsal, legal, or launch gates.
