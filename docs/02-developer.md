# 02 - Developer guide

- **Status:** Current
- **Owner:** Engineering
- **Purpose:** Provide a reliable setup path, repository map, invariants, and change checklist.
- **Last reviewed:** 2026-08-11

## Quick start

Use Node 24 and pnpm 11. The repository pins both.

```powershell
npm i -g pnpm@11.20.0  # only when pnpm is not already available
pnpm install
Copy-Item .env.example .env.local
pnpm run dev
```

Verification:

```powershell
pnpm run docs:check
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

Do not weaken a gate, enable a production flag, or copy live secrets into `.env.local` merely to make local work pass.

## Stack

| Layer        | Choice                                                    |
| ------------ | --------------------------------------------------------- |
| Application  | TanStack Start, React 19, TypeScript                      |
| Routing      | TanStack file routes under `src/routes`                   |
| Build        | Vite 8, Nitro, Node 24                                    |
| UI           | Tailwind CSS 4, shadcn/ui, Radix, Lucide, Framer Motion   |
| Client data  | TanStack Query and small `useSyncExternalStore` stores    |
| Database     | Supabase Postgres, Auth, Storage, Realtime, RLS           |
| Editorial AI | Anthropic-compatible structured generation                |
| Narration    | ElevenLabs, transcription checks, FFmpeg mastering        |
| Durable work | Vercel Workflow SDK                                       |
| Hosting      | Vercel, configured in `vercel.ts`                         |
| Payments     | Stripe code retained; new checkout disabled in pre-launch |
| Tests        | Vitest, TypeScript, ESLint, production build              |

## Repository map

```text
src/routes/                     pages and HTTP routes
src/workflows/                  durable daily-pundit workflow and retryable steps
src/components/                 product components and UI primitives
src/components/TodayShowPlayer.tsx  player-first Today experience
src/components/PunditAvatar.tsx     generated AI Pundit edition visuals
src/hooks/                      auth, entitlement and feed hooks
src/lib/pundit/                 current six-pundit intelligence system
src/lib/api/                    application services and legacy recap path
src/lib/player-store.ts         real HTML audio, queue, MediaSession, analytics
src/lib/today-show-model.ts     published edition to playable episode projection
src/lib/launch-config.ts        client fail-closed launch and billing flags
src/integrations/supabase/      clients and generated database types
src/styles.css                  design tokens and Tailwind 4 configuration
supabase/migrations/            ordered schema, RLS and database functions
scripts/backfill-history.mjs    bounded historical data operator
.github/workflows/verify.yml    CI verification
vercel.ts                       production schedules
docs/                           operating handbook
docs/product-state.json         machine-readable product and commercial truth
```

Use [`src/routes/README.md`](../src/routes/README.md) for the route inventory and [`03-architecture.md`](./03-architecture.md) for system flow.

## Engineering invariants

These rules protect the product contract:

1. **Pre-launch fails closed.** A missing flag denies checkout, rehearsals, forecasts, evaluation, snapshots, and publication.
2. **Facts precede prose.** Writers consume an immutable evidence pack and licensed claims.
3. **Hard gates are binary.** Do not average them with qualitative scores.
4. **Repair is targeted.** Passed beats stay frozen; failed beats receive at most three rounds.
5. **Scripts and performance plans are separate.** Code renders only allowlisted delivery directions.
6. **Audio verification fails closed.** Transcription or pronunciation outages cannot approve a take.
7. **Publication is atomic.** A drop needs all six variants and every promised asset.
8. **Predictions are immutable after kickoff.** Settlement uses the original rule.
9. **Player analytics come from real media events.** Never restore timer-based progress or simulated completion.
10. **AI Pundit switching is transactional.** Load the requested media before committing UI state or saved preference.
11. **Proof cards are projections.** Use only sealed evidence and licensed claim IDs; never generate a request-time explanation.
12. **One AI Pundit never substitutes for another.** Failure stays visible.
13. **Public copy says AI Pundit.** Keep `PunditId` and persona terms only where technical compatibility needs them.

## Current pundit pipeline

| Stage                  | Canonical code                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Evidence               | `src/lib/pundit/evidence.ts`, `structured-match.server.ts`                               |
| Claim licensing        | `src/lib/pundit/claim-lab.ts`, `quality-gates.test.ts`                                   |
| Persona definitions    | `src/lib/pundit/specs.ts`                                                                |
| Script generation      | `src/lib/pundit/pundit-generator.server.ts`                                              |
| Independent judges     | `src/lib/pundit/harness.ts`                                                              |
| Performance            | `src/lib/pundit/performance.ts`                                                          |
| Narration              | `src/lib/api/narration.server.ts`, `pronunciation.server.ts`                             |
| Mastering and assets   | `audio-mastering.server.ts`, `asset-storage.server.ts`, `share-card.server.ts`           |
| Forecasts and receipts | `forecast-training.server.ts`, `prediction-orchestrator.server.ts`                       |
| Orchestration          | `src/workflows/daily-pundit.ts`, `daily-pundit.steps.ts`, `daily-orchestrator.server.ts` |
| Release gate           | `release-readiness.server.ts`                                                            |

The older `recap-generator.server.ts` and `episode-pipeline.functions.ts` remain for archive and recovery compatibility. `ENABLE_LEGACY_DAILY_DROP` protects that route. New launch work belongs in `src/lib/pundit`.

## Routing and server code

- Routes are file-based. Never edit generated `routeTree.gen.ts`.
- A `createServerFn` export is an RPC boundary, not a plain internal function. Put reusable work in a plain server function, then wrap it for clients.
- Privileged Supabase, Stripe, provider, and filesystem imports stay in server-only modules or inside server handlers.
- Public handlers validate method, inputs, and authorization before any privileged access.
- Cron and internal routes use the shared timing-safe `isCronAuthorized` helper. No public-key fallback is permitted.
- New pages include title, description, canonical URL, social metadata, and honest loading, empty, error, and unavailable states.
- `/feed` is a compatibility redirect to Today. Do not rebuild a standalone Feed tab.
- The public shell contains Today, Teams, and Settings only. `/receipts` stays unlisted while its legacy page is replaced.

## Supabase rules

- Project reference: `hzadscrqmyilbisexvyz`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or import the admin client into browser-reachable code.
- Every new public table gets explicit grants, RLS, and policies in the same migration.
- User writes combine `TO authenticated` with an ownership predicate. Role membership alone is not authorization.
- Update policies use both `USING` and `WITH CHECK` when ownership may change.
- Security-definer functions require a fixed `search_path`, explicit execution grants, and advisor review.
- Published variants, sealed evidence, registered predictions, and receipts preserve immutability.
- Do not hand-edit `src/integrations/supabase/types.ts`; regenerate it from the confirmed target after schema changes.

See [`04-data-model.md`](./04-data-model.md).

## UI rules

- Tailwind 4 configuration lives in `src/styles.css`; there is no `tailwind.config.js`.
- Use semantic tokens, `surface`, `hairline`, `eyebrow`, and `text-mono`.
- Do not hardcode brand colors in components.
- Prefer loaders or TanStack Query to `useEffect` data fetching.
- Preserve keyboard access, visible focus, reduced motion, pinch zoom, transcripts, and real error states.
- Treat Relume as a component-pattern reference, not source code or a design authority.

## Environment model

Use [`.env.example`](../.env.example) as the complete variable inventory. Variables fall into four groups:

- public client values: `VITE_*` only;
- server platform and database secrets;
- explicit execution flags, all false by default;
- provider credentials and voice IDs.

Read server environment variables inside functions or handlers. Never print a key, store one in documentation, or pass one through a `VITE_*` name.

The Vercel CLI is optional. Install it when an approved operator task requires it:

```powershell
npm i -g vercel
```

## Tests and change discipline

Add the smallest test that proves the contract you changed. High-risk changes need adversarial coverage for unsupported tactics, unlicensed entities or numbers, causal overreach, prediction timing, RLS, cron denial, audio identity, or atomic publication.

Before handoff:

1. run focused tests while developing;
2. run the full verification set;
3. inspect `git diff --check` and the final diff;
4. update the owning document and the route or data map when relevant;
5. update `product-state.json` when behavior, gaps, offer state, or claim boundaries change;
6. update [`19-release-state.md`](./19-release-state.md) only if live state changed;
7. record a product decision in [`12-roadmap.md`](./12-roadmap.md) only when doctrine changed.

## Common failures

| Symptom                              | Likely cause                                                 | Response                                                                                                |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Unknown Tailwind utility             | Tailwind 4 context or token missing                          | Add the correct CSS reference or semantic utility                                                       |
| Internal route returns `401`         | Missing or mismatched cron bearer                            | Reconcile `CRON_SECRET`; never add a fallback                                                           |
| Internal route returns `409`         | Safe feature flag is false                                   | Enable only for the approved operation                                                                  |
| Script is quarantined                | A hard or qualitative gate failed                            | Inspect evidence spans and repair failed beats only                                                     |
| Narration is quarantined             | Transcript, number, name, voice, quota, or mastering failure | Fix the named input; never accept unverified audio                                                      |
| Workflow manifest is empty locally   | Current Windows build integration registers zero workflows   | Treat the build as failed; reproduce on Linux CI or repair the Workflow/Vite integration before release |
| DB write returns no rows             | RLS ownership or missing select policy                       | Inspect policy and caller role; do not bypass with service role                                         |
| Audio appears to play with no media  | Regression to simulated state                                | Restore real `<audio>` events and show unavailable state                                                |
| AI Pundit changes before media loads | Switch committed before the preload transaction completed    | Keep the old edition and save only after successful load                                                |
| Proof card has an invented reason    | Request-time explanation or unlicensed claim escaped         | Project only sealed evidence referenced by a licensed claim                                             |
