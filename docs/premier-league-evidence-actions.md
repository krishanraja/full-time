# Premier League evidence — scheduled non-API research intake

**Scope:** a private evidence intake with an opt-in, read-only product adapter. Intake does not publish programmes, run AI writers, create public citations, write Supabase, or trigger product workflows. The research is not assumed to have commercial reuse rights. No public or writer-facing citation requirement is imposed.

## Why

Full Time's North Star requires **every fact checked**. A reproducible, closed-world evidence ledger makes that requirement testable without converting editorial opinion into match facts. URLs, source IDs and minimal excerpts remain private operator evidence. The product adapter admits only an allowlist of counted numerical measurements into the existing evidence-pack builder. Shadow signals, refused claims, unnamed estimates and news snippets never cross that boundary. Activation is separate from implementation and requires approved production configuration.

## V2 delivery and product contract

The current implementation writes `premier-league-raw-v2-START-to-END.json` and `premier-league-normalised-v2-START-to-END.json`, followed by `premier-league-commit-START-to-END.json`. Earlier non-versioned archives remain historical and are not product inputs. The commit is the readiness marker and contains the exact SHA-256 of each JSON file. Every read reproduces normalisation from the raw ledger, compares independent fixture identities and score confirmations, and verifies both hashes. A verified no-game window is legitimate only when both authenticated feeds enumerate no completed matches; an unexplained empty collection fails.

Reruns read the original committed snapshot instead of repeating mutable news discovery. If delivery was interrupted after the raw file, `recoverSnapshot` reconstructs the same normalised bytes from its embedded manifest, completes delivery and reads the result back. A hash conflict, duplicate filename, inaccessible archive or invalid commit stops recovery. No conflicting archive is overwritten. A shared concurrency group serializes evidence writers across branches.

The source of truth is the committed Drive snapshot. `scripts/pl-evidence/snapshot.mjs` is the shared producer/consumer validator. `src/lib/pundit/evidence-intake.server.ts` reads the newest sealed covering window for the exact product match; `structured-match.server.ts` attaches the validated measurements. `buildEvidencePack` adds absent facts with raw-ledger lineage and deduplicates agreement. When an optional counted measurement differs from the product database, both observations and all dependent derivations are withheld, with the rejected field recorded in unavailable evidence. Identity or score disagreements still stop the match. The diagnostic can pin an exact historical window so a replay verifies its own snapshot instead of a newer overlapping one. The adapter is off unless `FT_EVIDENCE_INTAKE_ENABLED=true`. The server also requires `GOOGLE_DRIVE_OAUTH_JSON` and `FT_DRIVE_FOLDER_ID`, securely injected into the chosen deployment. GitHub repository secrets are not automatically Vercel environment variables. Never copy them into source or chat.

The three-day Sunday/Tuesday/Thursday cadence is retained. A match can precede its first scheduled snapshot. In that case the product records independent evidence as unavailable and retains its existing checked-data path; it never describes absent supplemental evidence as verified. A corrupt snapshot or disagreeing score fails closed. Future/uncompleted calendar windows are refused before collection. This cadence does not promise supplementary evidence before every daily show. No writer, publication flag, billing setting or database row is changed by intake.

Every successful collection runs `verify-product.mjs`, exercising actual collected values through the real product evidence-pack builder and saving `product-contract-verification.json`. It then runs `verify-live.mjs` against the authenticated `/api/internal/evidence-intake` route, checking the exact snapshot's fields, values, private lineage and consumed/withheld outcomes through the actual deployed match loader and pack builder. The latter writes `live-product-verification.json` and marks the local execution receipt partial if live consumption fails. Withheld observations are explicit in the report and never described as consumed. No paid generation or publication is needed. Rollback is to set `FT_EVIDENCE_INTAKE_ENABLED=false` and restore the prior approved deployment if necessary; committed evidence stays recoverable.

The earlier troubleshooting record below is historical. Run 39263887474 delivered nine fixtures after the malformed OAuth JSON was replaced; the v2 live result must be read from its own receipt and commit, not inferred from that earlier run.

### Verified v2 execution, 20 October 2026

- [Collection 39402187542](https://github.com/krishanraja/full-time/actions/runs/39402187542): 16-18 October, nine completed matches independently corroborated by API-Football and football-data.org. 350 counted facts/events, zero attributed model estimates, zero derived items, zero shadow signals, one refused item, ten rejections. Optional source failures are not hidden: 261/261 news queries attempted, nine found pairs across six domains, 139 without relevant coverage, 113 errors. RSS snippets remain snippets; no complete-article retrieval is claimed.
- [Replay 39402310007](https://github.com/krishanraja/full-time/actions/runs/39402310007): the same committed raw/normalised bytes were fetched and verified; `replayed: true`. No collection or duplicate archive creation was needed.
- Drive readbacks: [raw](https://drive.google.com/file/d/17AElWsMJUFafp56vAWH7vCWaHtEKED-O/view), [normalised](https://drive.google.com/file/d/1niASeAwfnAwj8hVygYsh0lUPfyNb1PVl/view), [commit](https://drive.google.com/file/d/1icL270g4uZjoVLDRlUNoQmU5EJU99DCf/view). Raw SHA-256 `e995b50fba2eee354e97561393aeaffbee12419af7fd31078376aa5170fabc18`; normalised `6c68ef22fad6ec4cd18dfb39eaa44c91126624eb380a477bbc745f55bee17181`. Downloaded Actions files independently matched these hashes.
- Actual collected snapshot through actual product builder: nine fixtures, 108 accepted counted measurements, zero shadow signals or unnamed estimates imported. No product database writes or paid models were used.
- [App CI 39402226692](https://github.com/krishanraja/full-time/actions/runs/39402226692): dependency audit, typecheck, 469 tests passing with two existing corpus skips, lint (zero errors, six existing warnings), full Linux production build and repository guards passed. Thirty separate ingestion/recovery/product-boundary tests passed. Vercel preview built successfully. The local Windows Vite build succeeded; its existing ffmpeg packaging step expects a Linux binary name and failed locally, so the passing Linux build is the packaging proof.
- Historical release boundary at that rehearsal: PR #88 was not yet merged and the product consumer was not activated. That boundary was cleared by the founder's explicit approval and the live activation below. The existing backup automation was not disabled.

### Production activated and read back, 20 October 2026

PRs #88, #89 and #90 are merged. Production configuration on the Vercel project serving `fulltime.fm` has the intake flag enabled, the exact folder configured and the OAuth credential stored as a sensitive server-only secret. The credential was transferred through an ephemeral RSA/AES-GCM runtime handoff; no plaintext credential was written to chat, logs, files or artifacts. The recipient private key existed only in operator process memory.

- [Historical end-to-end run 39407981016](https://github.com/krishanraja/full-time/actions/runs/39407981016): all nine matches verified through the deployed match loader and evidence-pack builder; 104 measurements consumed and four disagreements explicitly withheld.
- [Normal scheduled-window run 39407984999](https://github.com/krishanraja/full-time/actions/runs/39407984999), with no manual date override: 17-19 October, ten independently corroborated matches, 394 counted facts/events, zero attributed estimates, zero derived items, one internal shadow signal, one refused item and 21 rejections. All 290 publisher searches were attempted; no collection/delivery errors or source warnings. Both Drive JSON readbacks passed, and the downloaded Actions bytes independently matched the same hashes.
- The live product consumed 116 numerical measurements and withheld four disputed observations across three matches. Each withheld observation was removed together with any dependent calculation. The product's older stored provider observations differ from the archived provider observations for two blocked-shot counts and both possession percentages in one match; neither observation is chosen by preference. Scores all agree. No product database rows were rewritten.
- A separate authenticated readback using ordinary newest-window selection (no pinned window) verified all ten matches. Unauthenticated access returned HTTP 401. The diagnostic uses `Cache-Control: no-store` and performs no model call, persistence, narration or publication.
- [Current raw JSON](https://drive.google.com/file/d/1R0d3w1sSyi8QYenKnjId_qMTfMat2N09/view), SHA-256 `bb57b9448ebd031b119e3d430289acc9f8d4d2d56fb41a32af9de4f14f68edb5`; [current normalised JSON](https://drive.google.com/file/d/1bxVBBgJqYSlSk5AI-62sbgtEiOm5ZUmY/view), SHA-256 `e3aaf370b9d3c0381f1613ba2442d6b474e1acdc63d7e8d70687532dee4f28a3`; [snapshot commit](https://drive.google.com/file/d/1JhevZtgYyBZYTW3CkrXYzNyADvsLZnbr/view).
- Application verification: 473 tests passed with two existing corpus skips, 32 deterministic pipeline/runtime-handoff tests passed, typecheck and production dependency audit passed, lint had no errors and six existing warnings, and the full Linux production build passed. Production code carrying #90 was READY and assigned to `fulltime.fm` before the live checks.

Every subsequent intake now checks the live product as well as collection, normalisation and Drive hashes. The GitHub workflow is active on `main` with Sunday/Tuesday/Thursday 08:00 Europe/London scheduling. The next configured intake is Thursday 22 October 2026 at 08:00 London time; an actual future scheduled trigger has not been observed in this session. The old backup schedule remains enabled pending its separate retirement decision. Model API spend for evidence collection and all verification was $0.

Observed model API spend: $0. No model API is called by collection, normalisation, delivery, recovery or contract verification.

## Cadence, destination, outputs

Workflow: `.github/workflows/premier-league-evidence.yml`, Sunday, Tuesday and Thursday at **08:00 Europe/London**, including seasonal daylight-saving changes. The three **fully completed UK dates ending yesterday** are processed; a manual `workflow_dispatch` can specify `end_date` (inclusive).

Destination: `Non API Data inputs` in Google Drive, folder ID `1g1ZmO3PtsC54XudqxL7DlajkD9Nrzfcp`. Two immutable files per three-day window:

- `premier-league-raw-START-to-END.json`: fixtures, source-status matrix, exact small raw excerpts and match statistics with source IDs; **private operator data**.
- `premier-league-normalised-START-to-END.json`: five strictly licensed buckets, refused/rejected items, tallies, run status; still **internal-only**, not publisher input.

A third `receipt.json` in every Actions run artifact records the window, counted items, rejected items, upload IDs, Drive folder preflight, errors and source-query coverage. The Drive preflight is read-only and runs even when collection is partial, so the credential and folder can be diagnosed without uploading incomplete evidence. GitHub Actions retains the three local JSON artifacts for 30 days if upload fails. Failed/unavailable inputs produce `partial`, never a fabricated `complete`.

Retries never overwrite a differing JSON file for the same window. If file contents match, SHA-256 readback confirms the existing file. If they differ, the job fails with a mismatch and a GitHub artifact for comparison.

## Coverage strategy and boundaries

1. **Fixtures:** API-Football, already used by the product ingest, is the preferred authenticated fixture and statistics provider when `API_FOOTBALL_KEY` is configured in Actions. FotMob and ESPN remain public fallbacks. The independent football-data.org verification needs `FOOTBALL_DATA_KEY`; without it, report partial rather than inventing verification. All feeds require explicitly completed games and exact team/score/date resolution. ESPN is an auxiliary match-centre source for fixture and directly reported statistics, **not** a thirty-first editorial-opinion domain. Do not turn any outside-provider estimate into a counted fact. The 2026/27 20-team registry is pinned inside `core.mjs` and must change only when official season membership changes.
2. **Counted facts:** exact reported match-centre stats from the selected provider. For football-data.org fixtures, the collector requests each authenticated match detail separately; its response may contain team statistics and recorded goal, assist and booking events, while a fixture-list response does not. Final home/away goal totals are counted from checked final scores. No inferred zeros.
3. **Model numbers:** only with an explicit attributable model name. An unlabeled xG value goes to `rejected` with `model_unnamed`; that is intentional.
4. **Opinion:** Bing News RSS results filtered by the **exact publisher hostname** and both teams. Snippets are logged as snippets, not treated as full stories. Only explicitly recognised team observations enter shadow-signals. Everything else is refused/rejected. No open-ended LLM interpretation is allowed.
5. **Source pool (30 approved domains):** football365.com, bbc.com, theguardian.com, planetfootball.com, 90min.com, teamtalk.com, sportsmole.co.uk, spielverlagerung.com, breakingthelines.com, zonalmarking.net, theanalyst.com, blogarchive.statsbomb.com, understat.com, fbref.com, reddit.com, talksport.com, football.london, manchestereveningnews.co.uk, liverpoolecho.co.uk, thisisanfield.com, arseblog.com, theanfieldwrap.com, holdingmidfield.com, thefalse9.com, footballdna.co.uk, statsbomb.com, whoscored.com, fotmob.com, bigsoccer.com, footballtransfers.com. Not every publisher covers every match. The job logs `found`, `no_relevant_coverage`, `blocked`, `error`, and `not_attempted` without pretending universal coverage.

Research from unauthorised sites, article pages it cannot open, or guessed numerical models is never accepted. Bing, FotMob and news providers are third-party dependencies without availability guarantees. An empty or failed collection cannot be reported as complete. Check their terms before scaling automated use. **There is no assurance of acquiring a full 30-domain corpus every run.**

## Required GitHub Actions secrets

Configure in `krishanraja/full-time` → Settings → Secrets and variables → Actions → Repository secrets. **Never put their values in a Git file, issue, PR, shell output or a public artifact.**

- `GOOGLE_DRIVE_OAUTH_JSON` (**preferred for a personal My Drive folder**): one JSON object with keys `client_id`, `client_secret`, `refresh_token`, for the Google account that can write to the destination folder. Enable Google Drive API in a Google Cloud project, configure OAuth consent, issue an offline refresh token with Drive file creation/list/read permissions, and retain the full JSON as this one secret. The integration requests the Drive scope; review its breadth when authorising.
- Alternative `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`: JSON service account key. Grant its `client_email` writer access on the folder. Google service accounts may lack My Drive storage quota; if uploads fail, prefer the OAuth-user path or use an organisation-managed Shared Drive.
- `FOOTBALL_DATA_KEY`: existing football-data.org API token for independent result crosschecks. Without it the job intentionally fails as partial rather than claiming every score was verified.
- `API_FOOTBALL_KEY`: optional second provider credential used by Full Time's production ingest. It is distinct from `FOOTBALL_DATA_KEY`. The evidence workflow uses it for independent authenticated score confirmation and detailed statistics when public endpoints are blocked. Never copy its value through a PR or log.

All evidence collected without secrets is still retained as a GitHub run artifact. Without valid Drive credentials, the job fails after writing artifacts and never claims that Google Drive received them.

## Zero paid models by default

Collection is Node 24 built-ins, HTML/RSS parsing and HTTP requests, no LLM calls, so **model API cost is $0 per run**. Normalisation uses deterministic checks. HTTP sites or football-data.org may apply rate limits or commercial usage limits, which are not model API charges.

## Commands

```bash
# Deterministic tests; no credentials, network or model calls
node --test tests/pl-evidence.test.mjs tests/pl-evidence-reliability.test.mjs

# Live one-off intake; writes artifacts even if external/Drive gates fail
node scripts/pl-evidence/run.mjs --end 2026-10-18 --out ./pl-evidence-output
```

GitHub → Actions → **Premier League - independent evidence intake** → Run workflow. A scheduled trigger runs **only after the workflow is on the default branch**; a PR branch alone does not activate it. Judge success by the run receipt, fixture coverage, schema validation and both Drive SHA-256 readbacks. Partial datasets stay in the Actions artifact and are not sent to Drive.

## Cutover from ChatGPT scheduling

Leave the existing ChatGPT automation enabled until the new GitHub workflow has completed **at least one fully verified scheduled/dispatch run**, including Google Drive readbacks. Then disable the old scheduled automation to avoid duplicated requests and windows. Until then, GitHub is a staged replacement, not a live one.
## Founder scope ruling

Ruling (Krish, 2026-10-19): this is not being treated as a commercial source-reuse product; do not require sources to be cited publicly. Private source identifiers remain solely for rejecting contradictions and verifying the ingestion contract.

## Live-run troubleshooting (2026-10-19)

Observed workflow run [39249219149](https://github.com/krishanraja/full-time/actions/runs/39249219149): FotMob daily fixture requests returned HTTP 404 on all three dates; `FOOTBALL_DATA_KEY` was absent; Drive listed the target folder with HTTP 403. The original checks correctly withheld a fabricated success and retained three JSON artifacts, but the job had no alternative fixture discovery and collapsed Google 403 into an unhelpful generic message.

The first live GitHub-hosted ESPN smoke check also returned HTTP 403. When a `FOOTBALL_DATA_KEY` is configured, the collector therefore fetches that authenticated fixture registry for the date range before trying FotMob and ESPN. If both public feeds fail, it retains only the football-data.org fixtures explicitly marked `FINISHED`, records single-source status and keeps the output `partial`; no independent confirmation or detailed statistics are invented. If ESPN is available it remains a strictly attributed auxiliary match-centre source. Provider-specific IDs are never sent to another provider. A Google Drive error is now reported with the HTTP status and Google's machine-readable `reason`, without logging OAuth tokens or the raw response body. The upload preflight checks that the destination is a folder with create permission.

**If Drive still returns 403:** inspect the reason in the run receipt. `insufficientPermissions` / `ACCESS_TOKEN_SCOPE_INSUFFICIENT` means the saved refresh token lacks Drive access: regenerate it with `https://www.googleapis.com/auth/drive` in OAuth Playground while using your own OAuth client, then replace `GOOGLE_DRIVE_OAUTH_JSON` in Actions secrets. `accessNotConfigured` means enable Google Drive API on the Cloud project owning the OAuth client. `insufficientFilePermissions` means grant the signed-in account edit rights on the target folder. Do not expose the token itself in logs or PRs.

The authenticated fixture discovery and independent result verification remain blocked when `FOOTBALL_DATA_KEY` is missing. A functioning authenticated fixture feed can now yield a useful **partial** JSON result even when GitHub's public HTTP requests to both FotMob and ESPN are blocked. Both data and delivery must pass in a live Actions run before disabling the old ChatGPT schedule.
