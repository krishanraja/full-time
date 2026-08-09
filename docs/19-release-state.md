# 19 - Release state

This is the single source of truth for resuming the world-class pundit launch work. Historical documents remain useful for provenance but do not override this file, `docs/00-product.md`, or the two 2026-08-08 migrations.

## Current state

- Product state: `prelaunch`.
- Public launch: disabled and fail-closed.
- New checkout and Pro marketing: disabled.
- Six pundits: free and selectable.
- Branch: `codex/world-class-pundits`.
- Production deployment: still points to the pre-branch revision. This branch has not been deployed.
- Production database: the pundit-system, operational-release-gate, function-search-path and auth-RLS optimization migrations were applied to the confirmed FullTime project on 2026-08-08 and independently read back.
- Correct Supabase project reference: `hzadscrqmyilbisexvyz`.
- The configured Supabase connector still does not include that project. Production operations used the authenticated FullTime dashboard and process-injected Vercel secrets after verifying the project reference; no secret was printed or persisted.
- Database advisors after the migrations: performance has zero errors and zero warnings; security has zero errors and three accepted warnings (two deliberately public media buckets and password-leak protection on a passwordless customer flow).
- Vercel CLI 58.9.0 is installed and the `full-time` project link is valid. Environment values are process-injected for checks rather than pulled into a plaintext file.
- Relume is available as a React component catalogue. Its stacked-list interaction informed the searchable Receipts ledger and its grid-list structure validated the six-pundit selector. No Relume-owned source was copied, and Relume is not a product-logic or visual-design authority.
- The repository targets Node 24. The local ARM64 Node 25 runtime does not produce a valid Workflow manifest and must not be used for release builds.
- The dependency graph uses pnpm 11 with strict one-day release-age enforcement, blocked exotic transitive sources, six scoped security overrides, and an explicit four-package build-script allowlist.

## Implemented locally

1. Truthful pre-launch behavior, disabled checkout, six free pundits, current-date semantics, real audio playback, strict cron authentication and no simulated completion.
2. Immutable evidence packs, evidence-linked claims, six versioned pundit specs, independent hard and qualitative harnesses, targeted repair and quarantine.
3. Persona performance plans, strict transcription and number identity, pronunciation licensing, audio mastering, share-card rendering and content-addressed storage.
4. Atomic run claims, 14-step durable Workflow orchestration, six-variant parallel fan-out, authenticated run status, promise checks, rehearsal ledger and atomic publication.
5. Historical backfill operator, held-out forecast backtest, active-model control, pre-kickoff prediction registration, settlement and public receipts.
6. Deterministic 60-match evaluation corpus, resumable 360-script runs, human-review records and a revision-bound release-readiness evaluator.
7. Responsive mobile/desktop product shell, selectable pundit experience, premium daily-show state and clearer receipt ledger.

## Gates that code cannot self-approve

- Rights-cleared research-source whitelist and accepted original concept cards.
- Two commercially usable full-length voice auditions per pundit.
- Founder selection and humour/editorial/voice approval.
- At least 1.5 million monthly TTS characters and verified usage alerting.
- Two-season provider backfill and a held-out forecast win over the league base rate.
- 60 founder-approved evaluation matches, 360 passing scripts and blind fan/analyst review thresholds.
- Full-length audio panels meeting persona, pronunciation, authority, naturalness, timing and listenability thresholds.
- Seven consecutive on-time six-variant rehearsals.
- Revision-bound legal, privacy, accessibility, monitoring, rollback and feed-validation sign-offs.

The release-readiness endpoint reports every missing gate individually. It cannot average dimensions together and will not store a launch-ready snapshot unless every gate passes.

## Operator sequence

1. Confirm the existing Vercel project link and inject required environment values into individual processes without writing a local secret bundle.
2. Connect tooling to Supabase project `hzadscrqmyilbisexvyz` and confirm the project name before any write.
3. Apply migrations in timestamp order, run readbacks, and run database security and performance advisors.
4. Configure provider keys and keep every execution flag false by default.
5. Run the two-season history backfill in bounded date batches, then train the forecast without activation. Activate only a passing result.
6. Build and founder-review the 60-match corpus. Run all 360 scripts and collect blinded script/audio reviews.
7. Add licensed voice candidates, human-verified pronunciation entries and full-length audio reviews.
8. Enable private rehearsals and complete seven consecutive runs before the UK deadline.
9. Record every release sign-off against the exact Git revision.
10. Read the release-readiness endpoint. Enable its snapshot write only for the passing revision and store the immutable snapshot.
11. Deploy a preview, run browser/accessibility/feed/asset checks, then use a controlled Vercel production rollout.
12. Public launch and billing remain separate explicit mutations. Launch does not automatically enable billing.

## Rollback

- Application rollback: promote the last known-good Vercel deployment.
- Editorial rollback: set release state to `paused`, disable publication flags and leave stored predictions/receipts immutable.
- Data rollback: migrations are additive. Do not drop tables during incident response; stop writers and preserve audit records.
- Asset rollback: published variants are immutable and content-addressed. A failed persona is visible and is never silently replaced with another persona.

## Required verification commands

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
git diff --check
```
