# Full Time

Full Time is a pre-launch autonomous football morning show. It turns one verified match-data record into six distinct AI-pundit editions, then keeps a public receipt for every registered prediction.

> One football morning. Six genuinely different minds. Every opinion has evidence. Every prediction gets a receipt.

## Status

| Surface                | State                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Production             | [fulltime.fm](https://fulltime.fm) is live as a truthful preview                                 |
| Public launch          | Blocked by the release gates in [`docs/19-release-state.md`](./docs/19-release-state.md)         |
| Publication automation | Disabled and fail-closed                                                                         |
| Billing                | New checkout and paid claims disabled                                                            |
| Pundits                | All six are free and selectable without an account                                               |
| Database               | Current additive migrations applied to Supabase project `hzadscrqmyilbisexvyz`                   |
| Production authority   | GitHub `main` plus the current Vercel production deployment; last verified `READY` on 2026-08-11 |

The preview never relabels archive content as current, simulates playback, substitutes one persona for another, or publishes an unapproved variant.

## Start locally

Requirements: Node 24 and pnpm 11.

```powershell
npm i -g pnpm@11.20.0  # only when pnpm is not already available
pnpm install
Copy-Item .env.example .env.local
pnpm run dev
```

The public shell still renders when Supabase client values are absent. Generation, rehearsals, publishing, and billing remain unavailable until their server credentials and explicit feature flags are present.

Run the same checks used for release verification:

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

## How the product works

1. The ingest layer builds structured match records.
2. An immutable evidence pack separates facts, deterministic derivations, provenance, and unavailable evidence.
3. The claim laboratory licenses candidate facts, judgments, counterfactuals, and predictions before prose exists.
4. Each versioned pundit spec selects a separate thesis, uncertainty stance, humour mechanism, language, and prediction risk.
5. A showrunner creates a ten-beat, 750 to 1,100-word script for each pundit.
6. Hard gates and independent qualitative judges test the same candidate. Only failed beats may be repaired, for at most three rounds.
7. An approved script becomes a separate performance plan. TTS, transcription, pronunciation, number, mastering, and asset checks fail closed.
8. All six variants publish atomically only when every editorial, audio, asset, and release promise passes.
9. Pre-kickoff predictions settle against their original rules and remain visible as receipts.

The structured-data tier can support analysis of score progression, game state, recorded events, shots, xG, possession, conversion, substitutions, variance, and calibrated probabilities. It cannot prove pressing shapes, rest defence, spacing, body position, coaching intent, confidence, effort, or dressing-room dynamics. The unsupported-tactics gate blocks those claims.

## Six pundits

| ID         | Pundit          | Lens                                                  | Failure to avoid          |
| ---------- | --------------- | ----------------------------------------------------- | ------------------------- |
| `zen`      | The Reporter    | Balanced evidence and news judgment                   | Bland chronology          |
| `gaffer`   | The Gaffer      | Decisions, substitutions, game state, counterfactuals | Invented tactics          |
| `stats`    | The Numbers Guy | Probability, xG, variance, process versus outcome     | Stat dumps                |
| `romantic` | The Romantic    | Narrative turns and extraordinary actions             | Forced tactical lectures  |
| `doomer`   | The Doomer      | Fragility, downside paths, warning signs              | Cruelty or false fatalism |
| `banter`   | The Wind-Up     | Rivalry, contradiction, status, bold judgment         | Banter without evidence   |

No script or voice may imitate the recognizable style or vocal identity of a living pundit.

## Repository map

```text
src/routes/                 UI pages and HTTP endpoints
src/workflows/              durable daily-pundit workflow and isolated steps
src/lib/pundit/             evidence, claims, harnesses, forecasts, audio and release logic
src/lib/api/                legacy application services and shared server functions
src/components/             product components and UI primitives
supabase/migrations/        ordered schema and security history
scripts/                    bounded operator tools
.github/workflows/          CI and manual recovery triggers
vercel.ts                   production schedule configuration
docs/                       product, engineering, operations and go-to-market handbook
```

See [`src/routes/README.md`](./src/routes/README.md) for the route map and [`docs/02-developer.md`](./docs/02-developer.md) for engineering conventions.

## Safe configuration

Pre-launch defaults are intentional:

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

Missing flags deny access. Keep secrets in the deployment environment; never commit or print them. [`.env.example`](./.env.example) is the variable inventory.

The Vercel CLI is optional and not part of the repository baseline. Install it when an operator needs local environment, deployment, or log commands:

```powershell
npm i -g vercel
vercel link
vercel env pull .env.local
```

Environment pull and deployment are separate production operations. Follow [`docs/06-ops.md`](./docs/06-ops.md).

## Public interfaces

- `GET /api/public/pundits`
- `GET /api/public/drops/today?pundit=<id>`
- `GET /api/public/drops/:id/variants/:pundit`
- `PUT /api/profile/pundit`
- `GET /api/public/pundits/:id/predictions`
- `GET /api/public/pundits/:id/receipts`
- `GET /api/public/feed.rss`

The RSS feed is one canonical Reporter feed with one stable GUID per drop. Shared links can preview another pundit without overwriting the recipient's saved preference.

## Documentation

Start with the [documentation index](./docs/README.md). The governing order is:

1. [`docs/00-product.md`](./docs/00-product.md) for product doctrine.
2. [`docs/18-world-class-pundit-system.md`](./docs/18-world-class-pundit-system.md) for implemented system behavior.
3. [`docs/19-release-state.md`](./docs/19-release-state.md) for current production and launch state.

Historical plans never override those three files.
