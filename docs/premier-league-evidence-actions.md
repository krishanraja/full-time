# Premier League evidence — scheduled non-API research intake

**Scope:** an independent private research-data intake for Full Time. It does not publish programmes, run AI writers, create public citations, touch Supabase, or trigger any product workflow. The research is not assumed to have commercial reuse rights. No public or writer-facing citation requirement is imposed.

## Why

Full Time's North Star requires **every fact checked**. A reproducible, closed-world evidence ledger makes that requirement testable without converting editorial opinion into match facts. URLs, source IDs and minimal excerpts exist **inside the private raw ledger only** to detect contradictions and audit ingestion; listeners and writers receive no citations or shadow-signals through this workflow. The two output JSON files are **not wired to product publication**. A future integration requires separate tests and permission.

## Cadence, destination, outputs

Workflow: `.github/workflows/premier-league-evidence.yml`, Sunday, Tuesday and Thursday at **08:00 Europe/London**, including seasonal daylight-saving changes. The three **fully completed UK dates ending yesterday** are processed; a manual `workflow_dispatch` can specify `end_date` (inclusive).

Destination: `Non API Data inputs` in Google Drive, folder ID `1g1ZmO3PtsC54XudqxL7DlajkD9Nrzfcp`. Two immutable files per three-day window:

- `premier-league-raw-START-to-END.json`: fixtures, source-status matrix, exact small raw excerpts and match statistics with source IDs; **private operator data**.
- `premier-league-normalised-START-to-END.json`: five strictly licensed buckets, refused/rejected items, tallies, run status; still **internal-only**, not publisher input.

A third `receipt.json` in every Actions run artifact records the window, counted items, rejected items, upload IDs, errors and source-query coverage. GitHub Actions retains the three local JSON artifacts for 30 days if upload fails. Failed/unavailable inputs produce `partial`, never a fabricated `complete`.

Retries never overwrite a differing JSON file for the same window. If file contents match, SHA-256 readback confirms the existing file. If they differ, the job fails with a mismatch and a GitHub artifact for comparison.

## Coverage strategy and boundaries

1. **Fixtures:** FotMob's published Premier League match centre fixture metadata for each date, cross-checked with football-data.org when its key is available. No apparent result, unresolved club or score disagreement is accepted as a match claim. Official league pages remain a useful manual source when a fixture feed is unavailable. The 2026/27 20-team registry is pinned inside `core.mjs` and must be updated only when official season membership changes.
2. **Counted facts:** FotMob match-centre stats, using exact reported numbers. Final home/away goal totals are counted from checked final scores. No inferred zeros.
3. **Model numbers:** only with an explicit attributable model name. An unlabeled xG value goes to `rejected` with `model_unnamed`; that is intentional.
4. **Opinion:** Bing News RSS results filtered by the **exact publisher hostname** and both teams. Snippets are logged as snippets, not treated as full stories. Only explicitly recognised team observations enter shadow-signals. Everything else is refused/rejected. No open-ended LLM interpretation is allowed.
5. **Source pool (30 approved domains):** football365.com, bbc.com, theguardian.com, planetfootball.com, 90min.com, teamtalk.com, sportsmole.co.uk, spielverlagerung.com, breakingthelines.com, zonalmarking.net, theanalyst.com, blogarchive.statsbomb.com, understat.com, fbref.com, reddit.com, talksport.com, football.london, manchestereveningnews.co.uk, liverpoolecho.co.uk, thisisanfield.com, arseblog.com, theanfieldwrap.com, holdingmidfield.com, thefalse9.com, footballdna.co.uk, statsbomb.com, whoscored.com, fotmob.com, bigsoccer.com, footballtransfers.com. Not every publisher covers every match. The job logs `found`, `no_relevant_coverage`, `blocked`, `error`, and `not_attempted` without pretending universal coverage.

Research from unauthorised sites, article pages it cannot open, or guessed numerical models is never accepted. Bing, FotMob and news providers are third-party dependencies without availability guarantees. An empty or failed collection cannot be reported as complete. Check their terms before scaling automated use. **There is no assurance of acquiring a full 30-domain corpus every run.**

## Required GitHub Actions secrets

Configure in `krishanraja/full-time` → Settings → Secrets and variables → Actions → Repository secrets. **Never put their values in a Git file, issue, PR, shell output or a public artifact.**

- `GOOGLE_DRIVE_OAUTH_JSON` (**preferred for a personal My Drive folder**): one JSON object with keys `client_id`, `client_secret`, `refresh_token`, for the Google account that can write to the destination folder. Enable Google Drive API in a Google Cloud project, configure OAuth consent, issue an offline refresh token with Drive file creation/list/read permissions, and retain the full JSON as this one secret. The integration requests the Drive scope; review its breadth when authorising.
- Alternative `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`: JSON service account key. Grant its `client_email` writer access on the folder. Google service accounts may lack My Drive storage quota; if uploads fail, prefer the OAuth-user path or use an organisation-managed Shared Drive.
- `FOOTBALL_DATA_KEY` (optional but **strongly recommended for complete status**): existing football-data.org API token for independent result crosschecks. Without it the job intentionally fails as partial rather than claiming every score was verified.

All evidence collected without secrets is still retained as a GitHub run artifact. Without valid Drive credentials, the job fails after writing artifacts and never claims that Google Drive received them.

## Zero paid models by default

Collection is Node 24 built-ins, HTML/RSS parsing and HTTP requests, no LLM calls, so **model API cost is $0 per run**. Normalisation uses deterministic checks. HTTP sites or football-data.org may apply rate limits or commercial usage limits, which are not model API charges.

## Commands

```bash
# Deterministic tests; no credentials, network or model calls
node --test tests/pl-evidence.test.mjs

# Live one-off intake; writes artifacts even if external/Drive gates fail
node scripts/pl-evidence/run.mjs --end 2026-10-18 --out ./pl-evidence-output
```

GitHub → Actions → **Premier League - independent evidence intake** → Run workflow. A scheduled trigger runs **only after the workflow is on the default branch**; a PR branch alone does not activate it. Judge success by the run receipt, fixture coverage, schema validation and both Drive SHA-256 readbacks. A green core test is not evidence that external sites or credentials worked.

## Cutover from ChatGPT scheduling

Leave the existing ChatGPT automation enabled until the new GitHub workflow has completed **at least one fully verified scheduled/dispatch run**, including Google Drive readbacks. Then disable the old scheduled automation to avoid duplicated requests and windows. Until then, GitHub is a staged replacement, not a live one.
## Founder scope ruling

Ruling (Krish, 2026-10-19): this is not being treated as a commercial source-reuse product; do not require sources to be cited publicly. Private source identifiers remain solely for rejecting contradictions and verifying the ingestion contract.
