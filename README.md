# Full Time

Full Time is a pre-launch autonomous football morning show: one shared evidence base, six genuinely different AI pundits, and a public receipt for every registered prediction.

> One football morning. Six genuinely different minds. Every opinion has evidence. Every prediction gets a receipt.

The existing production site at [fulltime.fm](https://fulltime.fm) is a preview artifact. This branch is not deployed, its migration is not applied to production, and it must not be described as launch-ready.

## Product status

- `PRELAUNCH_MODE` fails closed unless explicitly set to `false`.
- Checkout and new Pro claims are disabled; existing subscribers can still reach billing management.
- All six pundits are free and selectable without an account.
- Legacy match recaps remain archive/demo material and cannot be relabelled as current in pre-launch.
- The legacy one-voice publisher requires a separate recovery flag even after pre-launch is disabled.
- Provider-backed private rehearsals require both cron authentication and `ENABLE_PRIVATE_REHEARSALS=true`.
- No production migration, generation run, checkout, deployment, or backfill is part of the local implementation.

Launch remains blocked on rights-cleared research sources, voice licensing and founder casting, TTS capacity, the two-season forecast backfill, the 60-match/360-script evaluation, blind human review, seven successful daily rehearsals, and the legal/accessibility/operational checklist.

## Architecture

The pipeline is deliberately layered:

1. Immutable evidence packs separate facts, derivations, provenance, and unavailable evidence.
2. A claim laboratory licenses facts, mechanisms, decision-quality judgments, counterfactuals, opinions, and predictions before prose exists.
3. Each versioned pundit spec independently selects a thesis, uncertainty stance, humour mechanism, language, prediction risk, and performance profile.
4. A structured ten-beat outline becomes a 750-1,100 word script.
5. Hard gates and independent qualitative judges run against the same candidate. Failed beats receive at most three targeted repair rounds; thresholds never relax.
6. The approved display script becomes a separate performance plan. Code renders allowlisted delivery directions and strict TTS fidelity checks fail closed.
7. Predictions lock before kickoff, settle against their original structured rule, and retain Brier score, log loss, and an explicit receipt.

Structured data cannot prove pressing shapes, rest defence, overloads, body position, coaching intent, confidence, effort, or dressing-room dynamics. The unsupported-tactics gate blocks those claims until richer licensed evidence exists.

## Six pundits

| ID         | Product         | Primary lens                                          |
| ---------- | --------------- | ----------------------------------------------------- |
| `zen`      | The Reporter    | Balanced evidence and news judgment                   |
| `gaffer`   | The Gaffer      | Decisions, substitutions, game state, counterfactuals |
| `stats`    | The Numbers Guy | Probability, xG, variance, process versus outcome     |
| `romantic` | The Romantic    | Narrative turns and exceptional actions               |
| `doomer`   | The Doomer      | Fragility, downside scenarios, warning signs          |
| `banter`   | The Wind-Up     | Contradiction, rivalry, status, bold judgments        |

None may imitate the wording, vocal identity, or recognisable style of a living pundit.

## Stack

- TanStack Start, React 19, TypeScript, Vite, Tailwind, shadcn/ui
- Supabase Postgres/Auth/Storage with RLS migrations
- Anthropic-compatible structured generation for writers and independent judges
- ElevenLabs narration with persona voices, performance plans, transcription and number checks
- Vercel configuration in `vercel.ts`
- pnpm 11 with a strict release-age policy, scoped security overrides, and an explicit dependency-build allowlist
- Vitest, TypeScript, ESLint, and production-build verification in GitHub Actions

## Local development

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm run dev
```

Populate only the environment values required for the surface being exercised. Public UI remains honest when client Supabase configuration is unavailable; paid generation remains disabled until its explicit flags and provider credentials are present.

Verification commands:

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

Vercel CLI 58.9.0 is installed and the project is linked. Environment pull and deployment still require separate operator approval:

```powershell
vercel env pull .env.local
```

Environment pull and deployment remain separate, approval-gated operations.

## Data migration and interfaces

The new schema is split across two ordered migrations:

- [`20260808194138_pundit_intelligence_system.sql`](./supabase/migrations/20260808194138_pundit_intelligence_system.sql): editorial evidence, claims, specs, variants, harnesses, predictions and research provenance.
- [`20260808200000_operational_release_gates.sql`](./supabase/migrations/20260808200000_operational_release_gates.sql): voice licensing, audio review, forecasts, evaluation, rehearsals, release sign-offs, atomic run claims and atomic publication.

Public interfaces:

- `GET /api/public/pundits`
- `GET /api/public/drops/today?pundit=<id>`
- `GET /api/public/drops/:id/variants/:pundit`
- `PUT /api/profile/pundit`
- `GET /api/public/pundits/:id/predictions`
- `GET /api/public/pundits/:id/receipts`
- `GET /api/public/feed.rss`

The RSS feed is one canonical Reporter feed with one stable drop GUID. Shared links preview a selected pundit without overwriting the recipient's saved preference.

## Documentation

- [`docs/00-product.md`](./docs/00-product.md): current product doctrine
- [`docs/18-world-class-pundit-system.md`](./docs/18-world-class-pundit-system.md): implementation map, safety boundaries, and launch blockers
- [`docs/19-release-state.md`](./docs/19-release-state.md): single release-state source of truth and operator sequence
- [`docs/04-data-model.md`](./docs/04-data-model.md): legacy data context; use the new migration as the current schema source
- [`docs/11-legal.md`](./docs/11-legal.md): legal workstream that must pass before launch
