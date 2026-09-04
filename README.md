# Full Time

Full Time is an AI-native football audio product. It turns one set of checked match facts into six complete shows, each made and performed by a different **AI Pundit**.

> One real match. Six AI Pundits. Pick the brain you fancy.

The product is meant to feel brilliant because it is AI, not like a cheaper imitation of a human podcast. The facts stay shared and evidence-bound. The argument, humour, script, delivery, and generated edition visual change with the AI Pundit.

## Current state

| Surface     | Repository and production state on 2026-09-04                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle   | Live beta by founder override; human review gates waived and listed in `docs/19-release-state.md`                                       |
| Production  | [fulltime.fm](https://fulltime.fm) serves the three-tab AI Pundit shell                                                                 |
| Navigation  | Today, Teams, Settings                                                                                                                  |
| Today       | Player-first show, six-AI-Pundit picker, real-media progress, same-pundit fallback, proof cards, recent shows, settled-only entry point |
| AI Pundits  | All six are free and selectable without an account                                                                                      |
| Avatars     | Abstract SVG visuals generated from the drop and AI Pundit IDs, so each edition gets a stable fresh look                                |
| Feed        | `/feed` redirects to Today; the Reporter RSS endpoint remains available                                                                 |
| Publication | The 04:45 UTC workflow publishes a drop automatically when all six editions pass the automated evidence, harness, and audio checks      |
| Billing     | New checkout is disabled; existing subscribers retain billing management                                                                |

Two secondary surfaces still carry legacy behavior. Teams is the public label for `/following`, but the route has not yet enforced Premier-League-only beta filtering. Today checks settled-only records, but `/receipts` still renders the older searchable prediction ledger. These gaps are recorded in [`docs/product-state.json`](./docs/product-state.json) and must not be marketed as complete.

## Try it locally

Requirements: Node 24 and pnpm 11.

```powershell
npm i -g pnpm@11.20.0
pnpm install
Copy-Item .env.example .env.local
pnpm run dev
```

The shell renders without Supabase client values. Generation, rehearsals, publication, and billing need server credentials plus explicit feature flags.

Run the full local gate:

```powershell
pnpm run docs:check
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

## What Today does

1. Loads the selected AI Pundit's approved edition for the London coverage date.
2. Falls back to that same AI Pundit's latest approved edition when today has none.
3. Shows the date, title, hook, AI Pundit, play control, and real audio progress in the first mobile viewport.
4. Lets the listener switch AI Pundits from a bottom drawer.
5. Commits a switch and saves the preference only after the requested audio loads.
6. Keeps the previous edition playable and offers retry when a switch fails.
7. Reveals up to three proof cards projected from sealed evidence and licensed claim IDs.
8. Shows recent approved editions and a quiet track-record entry only when those records exist.

No audio autoplays on first load. Request-time AI does not write proof cards. A missing AI Pundit never silently becomes another one.

## The six AI Pundits

| ID         | AI Pundit       | Public promise                                |
| ---------- | --------------- | --------------------------------------------- |
| `zen`      | The Reporter    | Calm, clear, and first with the facts.        |
| `gaffer`   | The Gaffer      | Spots the choices that changed the game.      |
| `stats`    | The Numbers Guy | Counts everything. Trusts almost nothing.     |
| `romantic` | The Romantic    | Finds the bit that made football feel magic.  |
| `doomer`   | The Doomer      | Sees the wobble before anyone else.           |
| `banter`   | The Wind-Up     | Starts arguments for fun. Football needs one. |

User-facing material always says **AI Pundit**. Internal database and TypeScript identifiers retain `PunditId` and persona terminology where changing them would damage compatibility or technical accuracy.

## Evidence contract

The system can support claims about recorded scores, events, substitutions, shots, xG, possession, saves, conversion, game state, variance, and calibrated probabilities. It cannot claim that structured data observed pressing shapes, spacing, body position, coaching intent, confidence, effort, or dressing-room dynamics.

Proof cards contain a plain claim, one to three recorded facts, and a boundary explaining what those facts cannot prove. They come from sealed evidence and licensed claims only.

## Repository map

```text
src/routes/                 Product pages, public APIs, and protected operator endpoints
src/components/             Today player, AI Pundit picker, generated avatars, shell, and UI
src/lib/pundit/             Evidence, claims, generation, forecasts, audio, and release logic
src/workflows/              Durable six-variant workflow and isolated steps
supabase/migrations/        Ordered schema, RLS, immutability, and publication functions
scripts/                    Verification, research intake, and bounded operator tools
docs/product-state.json     Machine-readable current product truth
docs/21-go-to-market-agent.md  Marketing and sales agent operating manual
docs/                       Product, engineering, operations, legal, and commercial handbook
```

Read [`src/routes/README.md`](./src/routes/README.md) for the exact route map.

## Safe defaults

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

Missing flags deny access. Keep secrets in the deployment environment and use [`.env.example`](./.env.example) only as a name inventory.

The Vercel CLI is optional but useful for approved environment, preview, and log work:

```powershell
npm i -g vercel
```

Pulling environments, deploying previews, and promoting production are separate operations.

## Documentation

Start with the [documentation index](./docs/README.md). Current product questions follow this order:

1. [`docs/product-state.json`](./docs/product-state.json) for machine-readable shipped behavior, gaps, commercial state, and claim boundaries.
2. [`docs/00-product.md`](./docs/00-product.md) for product doctrine.
3. [`docs/18-world-class-pundit-system.md`](./docs/18-world-class-pundit-system.md) for implementation.
4. [`docs/19-release-state.md`](./docs/19-release-state.md) for live and blocked state.
5. [`docs/21-go-to-market-agent.md`](./docs/21-go-to-market-agent.md) for autonomous marketing and sales work.

Historical plans explain old decisions. They never override current code or the product-state record.
