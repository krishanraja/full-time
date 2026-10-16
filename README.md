# Full Time

Full Time is an AI-native football audio product. It turns one set of checked match facts into six complete shows, each made and performed by a different **AI Pundit**.

> One real match. Six AI Pundits. Pick the brain you fancy.

The product is meant to feel brilliant because it is AI, not like a cheaper imitation of a human podcast. The facts stay shared and evidence-bound. The argument, humour, script, delivery, and generated edition visual change with the AI Pundit.

## Where it is going

Full Time is a B2C product for football fans, in a pilot beta with public release targeted for December 2026. Why it exists, where it is going, and the bar December has to clear are in [`docs/22-vision-and-beta.md`](./docs/22-vision-and-beta.md). Testers: tell us what you think at **krish@fulltime.fm**, or tap **Send feedback** in Settings.

## Current state

| Surface     | Repository state on 2026-10-16; production last read back 2026-09-04 in `docs/19-release-state.md`                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle   | Live beta by founder override since 2026-09-04, run as a pilot beta for invited fans since 2026-10-16; release targeted for December 2026 |
| Production  | [fulltime.fm](https://fulltime.fm) serves the three-tab AI Pundit shell                                                                 |
| Navigation  | Today, Teams, Settings, in a frame that never scrolls                                                                                   |
| Today       | One Premier League match at a time: competition, date, crests, score, the six AI Pundits as a rail, the player, and Show me why proof  |
| Teams       | The twenty clubs of the current Premier League season                                                                                  |
| AI Pundits  | All six are free and selectable without an account                                                                                      |
| Visuals     | A screenprint cover per AI Pundit and an engraved match seal in the two clubs' colours, generated as stable SVG                         |
| Feedback    | Settings, **Send feedback**: an email to krish@fulltime.fm with the three beta questions written in                                     |
| Feed        | `/feed` redirects to Today; the Reporter RSS endpoint remains available                                                                 |
| Publication | The 04:45 UTC workflow publishes every edition that passes the automated evidence, harness and audio checks; one that falls short is withheld |
| Billing     | New checkout is disabled; existing subscribers retain billing management                                                                |

One secondary surface still carries legacy behavior: `/receipts` has no in-app entry and still renders the older searchable prediction ledger. This and the other known gaps are recorded in [`docs/product-state.json`](./docs/product-state.json) and must not be marketed as complete.

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

1. Opens on the newest Premier League match with a published show, or on a shared link's own match.
2. Says which game it is: competition, date, both clubs with their crests, and the score, on one screen with no scroll.
3. Shows the six AI Pundits for that match as a rail, dimming any that made no show for it.
4. Plays the requested AI Pundit's edition when they made one, else the drop's canonical AI Pundit, and names who made the show.
5. Switches AI Pundit, or steps to an earlier or later match, only after the new audio loads; a failed switch keeps the old show playable and offers retry.
6. Opens **Show me why** proof one card at a time, up to three, from sealed evidence and licensed claim IDs.

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

Start with the [documentation index](./docs/README.md). For why Full Time exists and where it is going, read [`docs/22-vision-and-beta.md`](./docs/22-vision-and-beta.md). Current product questions follow this order:

1. [`docs/product-state.json`](./docs/product-state.json) for machine-readable shipped behavior, gaps, commercial state, and claim boundaries.
2. [`docs/00-product.md`](./docs/00-product.md) for product doctrine.
3. [`docs/18-world-class-pundit-system.md`](./docs/18-world-class-pundit-system.md) for implementation.
4. [`docs/19-release-state.md`](./docs/19-release-state.md) for live and blocked state.
5. [`docs/21-go-to-market-agent.md`](./docs/21-go-to-market-agent.md) for autonomous marketing and sales work.

Historical plans explain old decisions. They never override current code or the product-state record.
