# 06 - Operations

This is the current operating runbook. Release truth and required evidence live in `19-release-state.md`.

## Default posture

- The product is in fail-closed pre-launch.
- New checkout is disabled. Do not claim billing is live.
- All six pundits are free.
- Public publication is disabled.
- Private rehearsals are disabled unless an operator explicitly enables them.
- The legacy one-voice generator is disabled behind its own recovery flag.
- No failed persona may be replaced silently by another persona.

Required safe defaults:

```text
PRELAUNCH_MODE=true
BILLING_ENABLED=false
ENABLE_PRIVATE_REHEARSALS=false
ENABLE_LEGACY_DAILY_DROP=false
PUNDIT_PUBLICATION_ENABLED=false
ENABLE_FORECAST_TRAINING=false
ENABLE_PREDICTION_REGISTRATION=false
ENABLE_EVALUATION_RUNS=false
ENABLE_RELEASE_SNAPSHOT_WRITE=false
```

The matching client flags are `VITE_PRELAUNCH_MODE=true` and `VITE_BILLING_ENABLED=false`.

## Production schedules

`vercel.ts` is the schedule source of truth:

| Time, UTC | Endpoint | Purpose |
| --- | --- | --- |
| 00:15 | `/api/public/cron/ingest` | Structured match-data ingest and prediction settlement |
| 04:45 | `/api/internal/daily-rehearsal` | Durable six-pundit rehearsal or publication run |
| 06:30 and 16:30 | `/api/internal/predictions-register` | Pre-kickoff prediction registration |

GitHub workflows are manual recovery triggers only. Every scheduled or manual request requires the exact `Authorization: Bearer $CRON_SECRET` value. A missing secret fails closed.

## Daily run procedure

1. Confirm ingest completed for the intended London coverage date.
2. Confirm provider quotas, voice candidates, pronunciation entries and required feature flags.
3. Trigger `POST /api/internal/daily-rehearsal` with cron authorization.
4. Expect HTTP `202` with `runId` and `statusUrl`. A `202` means accepted, not passed.
5. Poll the authenticated status URL or inspect Workflow observability until the run is terminal.
6. Inspect the editorial run, all six variants and the stored promise checks.
7. Treat `failed` and `quarantined` as visible release failures. Never publish a partial drop.

The durable workflow has 14 steps. It claims an idempotent run, prepares one immutable evidence pack, creates six independent editorial variants in parallel, persists their harness evidence, creates six narrated variants in parallel, runs the exact publication promise set, and uses one atomic publication transaction only after every check passes.

## Failure guide

| Symptom | Meaning | Operator response |
| --- | --- | --- |
| `401` | Missing or mismatched cron bearer | Rotate or reconcile `CRON_SECRET`; do not add a fallback credential |
| `409 Private rehearsals are disabled` | Safe pre-launch flag is working | Enable only for an approved private run |
| `409 Pundit publication is disabled` | Public publication kill switch is working | Leave disabled until the release snapshot passes |
| No feature match | No complete structured-data candidate for the requested date | Fix ingest or use the correct coverage date |
| Editorial quarantine | One or more hard or qualitative gates failed | Inspect `harness_runs`; repair only failed beats |
| Narration quarantine | Fidelity, pronunciation, voice, quota or mastering gate failed | Fix the named input or provider issue; never accept unverified audio |
| Promise-check quarantine | One or more required variant, asset, harness or receipt promises are missing | Repair the missing record and rerun idempotently |
| Forecast activation rejected | Held-out model did not beat the baseline or lacked sufficient data | Keep scores private and improve the training data or model |

## Audio incidents

- A transcription outage blocks audio approval.
- A missing or unverified proper name blocks narration.
- More than three pronunciation dictionaries blocks narration; consolidate verified entries.
- Each TTS request is sentence-safe and at most 4,500 characters.
- FFmpeg must be available through the installed optional package or `FFMPEG_PATH`.
- Mastered duration, loudness and true peak are measured from the produced file.
- The account must expose at least 1.5 million monthly characters and sufficient retry reserve.

Do not delete a published prediction or receipt to hide a mistake. Pause publication, preserve the immutable audit trail and publish a correction or receipt through the normal product record.

## Content or safety incident

1. Set the release state to `paused` and disable publication flags.
2. Record the affected drop, variant, script, audio asset, evidence pack and harness versions.
3. Quarantine the affected variant or drop through an additive incident record. Do not overwrite another persona into its place.
4. Preserve registered predictions and settled receipts.
5. Fix the smallest failed layer, add an adversarial regression case and rerun the held-out suite.
6. Obtain the required editorial, legal or founder sign-off before resuming.

## Secret rotation

Server secrets live in Vercel environment variables. Manual recovery also needs the matching GitHub `CRON_SECRET` and `FULL_TIME_URL` values.

1. Reissue the credential at the provider.
2. Update every environment that legitimately uses it.
3. Update the GitHub secret when rotating `CRON_SECRET`.
4. Redeploy only with operator approval.
5. Verify the relevant authenticated canary.
6. Revoke the old value.

Never print a secret in chat, logs, shell output or committed files. `.env.example` is the canonical variable inventory and contains no values.

## Deployment and rollback

The application targets Vercel Node 24 through the Nitro Vercel preset. Build with Node 24; the Workflow compiler is not supported by this repository's local ARM64 Node 25 installation.

Vercel CLI 58.9.0 is installed and the project is linked. An operator-approved environment pull uses:

```powershell
vercel env pull .env.local
```

Environment pull, migration, preview deployment and production rollout are separate approval-gated actions.

Rollback rules:

- Promote the last known-good Vercel deployment.
- Set release state to `paused` and disable publication flags.
- Stop writers rather than dropping additive schema.
- Preserve content-addressed published assets and immutable prediction receipts.
- Run promise checks against the rollback revision before resuming schedules.

## Verification

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

A green local build is necessary but does not satisfy voice licensing, rights, human review, provider quota, database migration, seven-rehearsal or production sign-off gates.
