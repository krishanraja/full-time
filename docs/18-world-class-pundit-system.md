# 18 - World-class pundit system

## Implemented system

The current branch implements the fail-closed pre-launch foundation and the code/data contracts for the next production pipeline:

- `daily_drops`, immutable `evidence_packs`, `analysis_claims`, versioned `pundit_specs`, `pundit_variants`, `harness_runs`, `prediction_ledger`, `research_sources`, `concept_cards` and `pronunciation_lexicon`.
- Six complete `PunditSpec` records in code with analytical priorities, evidence preferences, uncertainty rules, humour mechanisms and safety targets, cadence, prediction risk, voice keys, examples and anti-examples.
- A closed-world evidence-pack builder with deterministic formulas and explicit unavailable evidence.
- Claim and script licensing that blocks missing evidence, unsupported tactics, causal overreach, unfalsifiable counterfactuals, unlicensed numbers or names, unsupported season consequences and outcome-equals-decision reasoning.
- A showrunner pipeline that generates claims before prose, creates a thesis and ten-beat 750-1100-word script, runs every qualitative harness independently in parallel behind a bounded provider semaphore, freezes passed beats and permits at most three targeted repairs.
- Persona performance plans separate from script text. Code maps plans to allowlisted TTS directions and six separately configured voices.
- Audio transcription now fails closed. A Scribe outage can no longer approve a take.
- Forecast validation, five-point persona adjustment limits, Brier score, log loss and receipt construction.
- Public endpoints for pundits, today, variants, predictions, receipts, RSS and signed pundit preference.
- A Receipts UI, truthful coverage-date UI, visible player failures, real-media completion analytics and strict cron authorization.
- Content-addressed Supabase Storage uploads for mastered audio and 1200x630 share cards.
- Two-pass FFmpeg loudness normalization, duration/speaking-rate/dynamic-range analysis and strict audio quarantine.
- Selected-voice and pronunciation-lexicon checks that require human-verified names and licensed full-length performance profiles.
- Atomic daily-run claims, stale-run recovery, six-variant production with bounded concurrency, asset promise checks and atomic all-or-nothing publication.
- A Node 24 durable Workflow SDK orchestration with 14 independently retryable steps, six-way editorial and narration fan-out, authenticated run status and idempotent resume behavior.
- Historical backfill tooling, held-out forecast training, baseline comparison, active-model gating and upcoming-fixture prediction registration.
- Deterministic 60-match scenario corpus construction and resumable 360-script evaluation batches.
- One revision-bound release-readiness snapshot covering editorial, human, audio, forecast, prediction, rehearsal, rights and operational sign-offs.
- Sentence-safe TTS chunking at 4,500 characters, at most three pronunciation dictionaries and provider-quota fail-closed checks.
- Research-corpus licensing that accepts originality comparisons only when approved concept cards retain explicit source-language spans.
- Relume component-catalogue patterns as UI references only. Product logic, data contracts and the visual system remain repository-owned.

## Safety switches

Set both client and server pre-launch flags:

```text
VITE_PRELAUNCH_MODE=true
PRELAUNCH_MODE=true
VITE_BILLING_ENABLED=false
BILLING_ENABLED=false
```

Checkout requires billing enabled and pre-launch explicitly false. Missing flags fail closed. Existing subscribers can still manage billing.

The legacy daily generator is blocked while `PRELAUNCH_MODE` is not exactly `false` and still requires the separate `ENABLE_LEGACY_DAILY_DROP=true` kill switch. Do not enable either path until six-pundit orchestration and every launch suite pass.

## Schedules

`vercel.ts` owns production schedules. GitHub workflows are manual recovery only:

- Ingest: 00:15 UTC.
- Six-variant rehearsal/publication endpoint: 04:45 UTC.
- Upcoming-fixture prediction registration: 06:30 and 16:30 UTC.

The daily endpoint is deliberately quarantined in pre-launch. GitHub workflows are manual recovery only. Every cron request requires the exact `Authorization: Bearer $CRON_SECRET` value; a missing secret rejects all requests.

## Local verification

```powershell
# Use Node 24. The repository pins this in .node-version and package.json.
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

The unit suite covers cron fail-closed behaviour, London/BST coverage boundaries, evidence derivations, unsupported-tactics attacks, deterministic number/entity/consequence licensing, falsifiability, persona differentiation, forecast scoring and performance/script identity.

## Database rollout

The migrations are additive and have not been applied to production by this branch. Review and deploy both new migrations in timestamp order through the normal Supabase migration workflow. Regenerate `src/integrations/supabase/types.ts` from the target project after deployment; do not hand-edit generated types.

## External gates still requiring evidence

Code cannot honestly manufacture these approvals:

- Rights-cleared research-source whitelist and founder acceptance of concept cards.
- Two commercially usable voice candidates per pundit and a final founder taste selection.
- At least 1.5 million monthly approved TTS characters.
- Two-season data backfill and held-out forecast superiority over the league base rate.
- The 60-match/360-script evaluation corpus, blind fan/analyst panels and founder humour review.
- Seven consecutive private six-variant rehearsals.
- Production legal, privacy, accessibility, monitoring, rollback and feed-validator sign-off.

Until those are recorded, the site remains an honest preview and the public tables remain empty.
