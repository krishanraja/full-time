# 13 - Agent and contributor handoff

- **Status:** Current
- **Owner:** Engineering
- **Purpose:** Let a new contributor understand the product, risks, and next safe action in ten minutes.
- **Last reviewed:** 2026-08-10

## Start here

Read in this order:

1. [`00-product.md`](./00-product.md)
2. [`18-world-class-pundit-system.md`](./18-world-class-pundit-system.md)
3. [`19-release-state.md`](./19-release-state.md)
4. the role guide for your task from [`README.md`](./README.md)

Do not begin from the historical build or access plans.

## Project in one paragraph

Full Time is a pre-launch autonomous football morning show. One immutable evidence base produces six separate pundit editions, each with its own thesis, humour, script, delivery, voice, and prediction record. Hard gates prevent unsupported facts and tactics; independent harnesses score quality; audio verification fails closed; all six variants publish atomically; every pre-kickoff claim returns as a receipt.

## Current truth

- Production preview: [fulltime.fm](https://fulltime.fm).
- Production revision: `36fd607e2ef862894434a3aafd0c7e378f3d5f68`.
- Product mode: pre-launch.
- Public publication, new billing, evaluation execution, and public forecast scores: disabled.
- Six pundits: free and selectable.
- Current schema: applied to Supabase project `hzadscrqmyilbisexvyz`.
- Launch blockers: licensed sources and voices, TTS capacity, two-season forecast proof, 360 scripts, full-length blind review, seven rehearsals, and revision-bound sign-offs.

## Non-negotiable invariants

- Evidence precedes claims; claims precede prose.
- The structured-data tier cannot claim film-specific tactics or human intent.
- Hard gates cannot be averaged away.
- Only failed beats may be repaired, for at most three rounds.
- A transcription outage cannot approve audio.
- A prediction cannot change after kickoff.
- A wrong receipt remains visible.
- All six variants must pass before publication.
- Real media events drive playback progress and completion.
- A missing persona remains a visible failure.
- Missing feature flags deny execution.
- No living-pundit wording, style, or voice imitation.

## Where to work

| Task                       | Start with                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Evidence or claims         | `src/lib/pundit/evidence.ts`, `claim-lab.ts`                                             |
| Persona behavior           | `src/lib/pundit/specs.ts`                                                                |
| Scripts or harnesses       | `pundit-generator.server.ts`, `harness.ts`                                               |
| Narration or pronunciation | `performance.ts`, `narration.server.ts`, `pronunciation.server.ts`                       |
| Audio or share assets      | `audio-mastering.server.ts`, `share-card.server.ts`                                      |
| Forecast or receipts       | `forecast*.ts`, `prediction-*.server.ts`                                                 |
| Rehearsal or publication   | `src/workflows/daily-pundit.ts`, `daily-pundit.steps.ts`, `daily-orchestrator.server.ts` |
| Release gates              | `release-readiness.server.ts`                                                            |
| UI                         | `src/routes`, `src/components`, `src/styles.css`                                         |
| Schema or RLS              | `supabase/migrations`, [`04-data-model.md`](./04-data-model.md)                          |
| Incident                   | [`06-ops.md`](./06-ops.md), [`05-content-safety.md`](./05-content-safety.md)             |

## First-turn checklist

1. Inspect `git status` and preserve unrelated work.
2. Confirm the current branch and revision.
3. Read the owning docs and nearby tests.
4. Verify assumptions against code, migrations, or platform state.
5. Make the smallest coherent change.
6. Add focused tests for the contract at risk.
7. Run the full verification set before handoff.

## Verification

Use Node 24:

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```

A green build is not launch approval. Never mark external or founder gates complete without their recorded evidence.

## Production actions

Reading logs, deployment metadata, and database state is allowed when relevant. A migration, environment change, generation run, production deployment, public launch, or billing activation is a separate production mutation. Confirm the target and follow [`06-ops.md`](./06-ops.md).

The available Supabase connector may not have access to the FullTime project. Do not switch to a similarly named project. The target reference is `hzadscrqmyilbisexvyz`.

The repository does not assume the Vercel CLI is installed. Install it only when an approved operator task needs local Vercel commands.

## Handoff format

End substantive work with:

- **Outcome:** what now works;
- **Changed:** files and behavior;
- **Verified:** exact commands, tests, deployment, or readbacks;
- **Still blocked:** external evidence or follow-up, with owner;
- **Production state:** whether anything live changed;
- **Risks:** narrow known limitations, not generic caveats.

Never say "done" when a required gate, check, or production action remains.
