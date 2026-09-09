# History log

Newest first. Entries are written by the docs steward (see the steward link in
NOW.md) and by humans doing the same job by hand. Nothing in this file
describes current behaviour; NOW.md and `docs/19-release-state.md` do.

## 2026-09-09

- reconciled at `e8bd2dd`: head moved from `adddf64`. The five commits since were `a8d4e24`, `733afe1`, `b662cd3`, `22d396d` and `e8bd2dd`; four of them render or sync the shared canon block inside AGENTS.md, which the steward never edits, and the fifth (`b662cd3`) corrected AGENTS.md's own claim that NOW.md is reconciled on every push, not only validated.
- reconciled at `e8bd2dd`: `docs/README.md`. "Maintaining the handbook" step 7 carried the same wrong freshness claim `b662cd3` had just fixed in AGENTS.md, that the steward maintains NOW.md "on every push to main and nightly". Corrected to validated on push, reconciled nightly. Review date bumped to 2026-09-09 because the body was checked.
- rolled from NOW.md: 2026-08-08 six-persona launch system (`ed5b1fb`): evidence-licensed claims, independent gates, prediction receipts, six narration pipelines, durable workflows, fail-closed release controls.

## 2026-09-07

- decision: docs steward adopted for this repo, Krish 2026-09-07. `NOW.md` and this log are the two files it owns; `docs/history/` is the archive directory from today. Caller workflow at `.github/workflows/docs-steward.yml`, nightly at 20:25 UTC.
- reconciled at `adddf64`: three current documents disagreed on launch state. `README.md` (2026-09-05) and `docs/19-release-state.md` (verified 2026-09-04) recorded the founder launch override and per-edition publication; `docs/12-roadmap.md` and `docs/13-agent-handoff.md` (both 2026-08-11) still said pre-launch, publication disabled, blocked for launch. The code settles it: migration `20260904120000_founder_launch_override.sql` sets `release_state` live, migration `20260905060000_publish_the_variants_that_passed.sql` publishes each edition that passed. Roadmap and handoff re-headed to live beta; the roadmap keeps every earlier decision and gains dated override entries.
- reconciled at `adddf64`: `docs/12-roadmap.md`. Current objective and workstream table now state the override; decision log gains 2026-09-04 (launch by founder override) and 2026-09-05 (publish the pundits that passed); the 2026-08-08 "Launch by evidence, not date" entry keeps its text and carries a dated override note.
- reconciled at `adddf64`: `docs/13-agent-handoff.md`. "Project in one paragraph" and "Current truth" say live beta and per-edition publication; the Teams gap no longer claims the three-team prompt (removed in `407be64`); "Where to work" gains the cost, preflight, calibration and publication-decision modules.
- reconciled at `adddf64`: `docs/19-release-state.md`. Current state table: override migration recorded as applied (per `docs/product-state.json` verification), publication migrations applied through 2026-09-05 (per commit records `ce44014`, `d4bc163`), first published edition recorded from commits `407be64` and `5ed4712`. Live readback date unchanged at 2026-09-04.
- reconciled at `adddf64`: `docs/00-product.md`. Fallback now describes the widened any-pundit fallback (`407be64`); "Current posture" says live beta by override; the launch standard keeps its text and points at the waived-gate record.
- reconciled at `adddf64`: `docs/02-developer.md`. Invariants 1, 4 and 7 updated to flags fail closed, bounded repair rounds (default two, ceiling ten), and per-edition publication; pipeline table gains cost, stub, preflight, calibration, promise-check and dimension-standard modules.
- reconciled at `adddf64`: `docs/03-architecture.md`. Orchestration, publication model, failure semantics and deployment state updated from atomic six-variant publication to per-edition publication under the live beta.
- reconciled at `adddf64`: `docs/04-data-model.md`. `publish_daily_drop` described as per-edition; migration order extended with the 2026-09-04 and 2026-09-05 migrations; `daily_drops` generation cost and `match_stats` shot location noted.
- reconciled at `adddf64`: `docs/05-content-safety.md`. Repair rounds are bounded and configurable rather than fixed at three; the written dimension standards and the 2026-09-06 scale anchor are recorded with their code path.
- reconciled at `adddf64`: `docs/06-ops.md`. Default posture, rehearsal step 8 and the failure guide now say per-edition publication; lever 1 corrected to what `publish_daily_drop()` and `promise-checks.server.ts` do, with the open question recorded in NOW.md.
- reconciled at `adddf64`: `docs/18-world-class-pundit-system.md`. Implementation state says live beta with automatic per-edition publication; pipeline table gains the new modules; Teams gap and the `latest` response field corrected against `following.tsx` and `editorial-public.server.ts`.
- reconciled at `adddf64`: `README.md`. Current state table dated to the repository head; Today row and step 2 describe the widened fallback.
- reconciled at `adddf64`: `src/routes/README.md`. Known route gaps and `/archive` state corrected; review date bumped because the whole map was checked against `src/routes`.
- reconciled at `adddf64`: `docs/product-state.json` and `scripts/check-documentation.mjs`. `asOf` moved to 2026-09-07 in both; Today fallback, Teams gap and operations bullets updated. `lifecycle` unchanged at `live-beta`.
- reconciled at `adddf64`: `docs/README.md`. Index gains `NOW.md` and `docs/history/LOG.md`; vocabulary gains live beta; whole index re-read and its review date bumped.
- archived: `docs/14-build-plan.md`, Historical by its own header since 2026-08-11 (original date 2026-06-17). Left in place; this log indexes it.
- archived: `docs/15-access-and-waitlist-plan.md`, Historical decision record by its own header since 2026-08-11 (period 2026-07-06 to 2026-08-08). Left in place; this log indexes it.
- not changed, waiting on Krish: `docs/07-marketing.md`, `docs/08-sales.md`, `docs/10-support.md`, `docs/21-go-to-market-agent.md` still describe pre-launch. Commercial wording is not the steward's to change.
- decision: Krish 2026-09-07, the accepted review-date regex in `scripts/check-documentation.mjs` gained 2026-09-07 (the same lockstep mechanism as `asOf`). Stamped to 2026-09-07: `00-product`, `02-developer`, `03-architecture`, `04-data-model`, `05-content-safety`, `06-ops`, `12-roadmap`, `13-agent-handoff`, `18-world-class-pundit-system`, `19-release-state`, plus `docs/README.md` and `src/routes/README.md`. Left at their old stamps because their bodies were not checked: `01-brand`, `07`, `08`, `09`, `10`, `11`, `20`, `21`.
