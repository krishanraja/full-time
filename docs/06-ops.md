# 06 - Operations

- **Status:** Current runbook
- **Owner:** Release operator and on-call
- **Purpose:** Operate rehearsals, publication, incidents, secrets, deployments, and rollback safely.
- **Last reviewed:** 2026-08-11

## Default posture

Production is a truthful pre-launch preview. These values are the safe baseline:

```text
VITE_PRELAUNCH_MODE=true
PRELAUNCH_MODE=true
VITE_BILLING_ENABLED=false
BILLING_ENABLED=false
ENABLE_PRIVATE_REHEARSALS=false
ENABLE_LEGACY_DAILY_DROP=false
PUNDIT_PUBLICATION_ENABLED=false
PUBLIC_FORECAST_SCORES_ENABLED=false
ENABLE_FORECAST_TRAINING=false
ENABLE_PREDICTION_REGISTRATION=false
ENABLE_EVALUATION_RUNS=false
ENABLE_RELEASE_SNAPSHOT_WRITE=false
```

Keep public publication, new checkout, legacy generation, and public forecast scores disabled until the exact revision passes [`19-release-state.md`](./19-release-state.md).

## Schedules

[`vercel.ts`](../vercel.ts) is authoritative:

| UTC             | Endpoint                             | Job                                                          |
| --------------- | ------------------------------------ | ------------------------------------------------------------ |
| 00:15           | `/api/public/cron/ingest`            | Ingest structured match data and settle eligible predictions |
| 04:45           | `/api/internal/daily-rehearsal`      | Run the six-variant durable workflow                         |
| 06:30 and 16:30 | `/api/internal/predictions-register` | Register upcoming predictions before kickoff                 |

GitHub workflows are manual recovery only. Every request uses `Authorization: Bearer $CRON_SECRET`. A missing secret rejects the request.

## Daily rehearsal

1. Confirm the London coverage date and successful ingest.
2. Confirm provider quotas, selected licensed voices, and required pronunciation entries.
3. Confirm only the flags needed for this private run are enabled.
4. Call `POST /api/internal/daily-rehearsal` with the cron bearer.
5. Record the `runId` returned with HTTP `202`. Accepted is not passed.
6. Follow the authenticated status or Workflow observability to a terminal state.
7. Inspect the editorial run, six variants, harness evidence, audio results, assets, predictions, and promise checks.
8. Record the rehearsal result. Do not publish a partial drop.
9. Return temporary execution flags to false.

## Failure guide

| Signal                      | Meaning                                                               | Response                                                  |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `401`                       | Cron bearer missing or wrong                                          | Reconcile or rotate `CRON_SECRET`; do not add a fallback  |
| `409` with disabled message | Feature flag denied the operation                                     | Enable only for an approved run                           |
| No candidate match          | Ingest/date/data completeness problem                                 | Fix data or coverage date                                 |
| Editorial quarantine        | Hard gate or qualitative floor failed                                 | Repair failed beats only                                  |
| Narration quarantine        | Voice, transcript, number, pronunciation, quota, or mastering failure | Fix the named input; never override                       |
| Asset quarantine            | Required audio, transcript, artwork, or storage promise missing       | Repair and rerun idempotently                             |
| Forecast rejected           | Held-out result did not beat baseline                                 | Keep inactive and scores private                          |
| Release blocked             | One or more revision-bound gates missing                              | Complete evidence; never lower thresholds                 |
| One persona failed          | Six-variant promise broken                                            | Keep the drop unpublished and show the failure internally |

## Audio runbook

- Require the selected, licensed voice for the exact pundit.
- Require human-verified pronunciation for launch names.
- Keep each sentence-safe TTS request at or below 4,500 characters.
- Use no more than three pronunciation dictionaries per request.
- Require transcription, number identity, duration, speaking rate, loudness, true peak, dynamic range, and artifact checks.
- Require at least 1.5 million monthly approved characters plus retry reserve and usage alerts.
- Treat provider or transcription outages as blocking.

## Content incident

1. Set release state to `paused` and disable publication.
2. Preserve evidence, claims, script, performance plan, audio, harnesses, prediction, and asset paths.
3. Quarantine the variant or drop through an additive record.
4. Add a regression case for the escaped failure.
5. Repair the smallest layer and rerun the held-out suite.
6. Obtain the required editorial, legal, and founder approval.
7. Publish a correction or receipt if the content reached users.

Do not delete or rewrite an immutable prediction, receipt, or published asset during incident response.

## Secret rotation

Server secrets live in Vercel environment variables. GitHub manual recovery needs matching `CRON_SECRET` and `FULL_TIME_URL` values.

1. Issue a replacement at the provider.
2. update only the environments that use it;
3. update GitHub recovery secrets when relevant;
4. deploy or restart through an approved rollout;
5. run a narrow authenticated canary;
6. revoke the old value;
7. confirm no value appeared in logs, chat, shell history, or files.

Never print a secret. [`.env.example`](../.env.example) records names only.

## Deployment

Production targets Vercel Node 24. The 2026-08-11 Windows verification produced the application bundle under both Node 25 and the required Node 24.19.0, but the Workflow plugin registered zero steps and zero workflows. `scripts/check-workflow-manifest.mjs` correctly failed that local build. GitHub Actions run `31533126034` then passed the production build on Ubuntu with Node 24 for merge `0933a63`. Use Linux CI or a matching Vercel build as the release-build authority; the current Windows environment is not a trustworthy Workflow-manifest validator.

The Vercel CLI is optional and not assumed installed. Install it when an approved operator workflow requires local commands:

```powershell
npm i -g vercel
vercel link
vercel env pull .env.local
```

Linking, environment pull, migration, preview deployment, production promotion, public launch, and billing are separate actions. Approval for one does not imply the others.

Before production promotion:

1. verify the exact Git revision;
2. run the full local checks on Node 24;
3. verify database migrations and advisors on the confirmed project;
4. inspect the preview across mobile, desktop, accessibility, auth, Today switching, proof cards, Teams, track record, Settings, RSS, machine-facing metadata, and failure states;
5. confirm pre-launch and billing flags;
6. review build and runtime logs;
7. record the deployment ID in [`19-release-state.md`](./19-release-state.md).

## Rollback

- Promote the previous known-good deployment.
- Set release state to `paused` and turn publication flags off.
- Stop writers before considering data changes.
- Keep additive schema, audit history, predictions, receipts, and content-addressed assets.
- Run promise checks against the rollback revision before resuming schedules.

## Verification baseline

```powershell
pnpm run docs:check
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

Record the revision, deployment ID, database project, operator, timestamp, and result for every production rehearsal or release action.
