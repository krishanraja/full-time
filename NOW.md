---
repo: krishanraja/full-time
product: Full Time
as_of: 2026-09-07
head: adddf64
lifecycle: beta
production_url: https://fulltime.fm
state_doc: docs/19-release-state.md
history_log: docs/history/LOG.md
truth_files: [docs/product-state.json]
authority_order: [code and migrations and live readback, docs/product-state.json, docs/00-product.md, docs/18-world-class-pundit-system.md, docs/19-release-state.md, the role-specific current guide in docs/README.md, historical and proposed records never direct current work]
steward: https://github.com/krishanraja/control-center/blob/main/docs/steward/RUNBOOK.md
never_publish: [the product name Full Time and the domain fulltime.fm, the sport (football) and any league or competition, any team or player or fixture named in this repo or its commits, the match data providers (API-Football and football-data), the voice vendor (ElevenLabs), the Supabase project id, any credential or environment variable name, the six AI Pundit names]
---
# Full Time: where it is right now

## What it is

Full Time turns one set of checked football facts into six complete audio shows, each written, argued and performed by a different AI Pundit. One real match a day, chosen by importance, becomes a sealed evidence pack; a claim laboratory licenses what can be said about it; six persona writers (Opus) each produce a ten-beat script; twenty-five named harnesses per edition (deterministic licence gates plus twelve independent qualitative judges) decide whether it publishes; a synthetic voice narrates it, transcription and loudness checks verify the audio, and `publish_daily_drop()` puts each edition that passed in front of listeners. A TanStack Start app on Vercel, Supabase behind it, built and run by one person. The product doctrine is `docs/00-product.md`; the implementation map is `docs/18-world-class-pundit-system.md`.

## Who it is for and why it matters for Mindmake

Full Time is not a Mindmake product and is not sold. It is proof. The room_face buyer (`control-center/docs/ICP.md`: a senior leader at a PE or VC backed media, adtech, publishing or data business, quietly behind on what is coming) is being told that AI will remake editorial production. This repo is one person doing it end to end, in public, with the failures left in the commit log. A writer will anonymise it as a side build; these are the truths that survive anonymisation:

- **An editorial standard you can run, not a style guide.** Publication is gated by twelve qualitative dimensions at four out of five plus deterministic fact, number and entity licences. The 2026-09-06 calibration work found the bar had drifted to a place that "rejects the show it published and rejects the professional press", and fixed it by stating in writing what a four is. That is the argument for judges with written standards over taste.
- **The cost of a show is a number, per show.** A six-pundit run was measured at 2.14 US dollars of model spend (writer 1.06 across twelve calls, judges 0.99 across eighty-four), recorded per drop in the database, with a per-step spend ceiling that stops a run. "The bill is output tokens, not input." That is a Money of AI story about where the money in AI content actually goes.
- **Publish what passed, withhold what did not.** Six independent standards had been compounded into one all-or-nothing gate and "the last full run had one variant clean and five short, and produced nothing." The fix changed the publication boundary without loosening a single gate.
- **The failures were the operator's, found by reading what the run stored.** Six pundits failing the same harness meant one shared input, not six bad writers: a claim laboratory that returned thirty-five claims holding about ten ideas, a form lookup with no lower bound, a licence that refused names the pack itself displayed. That is the honest version of "AI in production" a media leader will not hear from a vendor.

Objection it answers: "AI-generated editorial cannot be held to a standard." Here is one held to twenty-five of them, daily, with the ledger open.

## Where it is right now (as of 2026-09-07)

- **Lifecycle: live beta by founder override, 2026-09-04.** Migration `supabase/migrations/20260904120000_founder_launch_override.sql` recorded an explicit override gate snapshot and set `release_state` to live; the waived human, rights, voice, rehearsal and forecast gates are listed in `docs/19-release-state.md`. `docs/product-state.json` records the migration applied and read back as live on 2026-09-04.
- **Live at fulltime.fm**: the three-tab shell (Today, Teams, Settings), all six AI Pundits free without an account, Reporter RSS retained, `/feed` redirects to Today. Last live readback in `docs/19-release-state.md` is 2026-09-04 20:50 UTC; nothing in this repo can confirm the production environment flags after that.
- **Publication is per edition since 2026-09-05** (`20260905060000_publish_the_variants_that_passed.sql`, `src/lib/pundit/promise-checks.server.ts`): a drop publishes every edition that passed all its gates and withholds the rest; a drop with no clean edition fails. The 04:45 UTC cron in `vercel.ts` runs it daily.
- **One edition has published.** Commit `407be64` records that on 2026-09-05 exactly one pundit passed (The Romantic) and listeners of the other five saw an empty state until the fallback was widened. Commit `5ed4712` records that nothing published between 5 and 6 September because the judge standards had moved the bar. Whether a later drop has published is a database fact, not a repository one.
- **Cost controls are live in code**: a per-step spend ceiling (`PUNDIT_MAX_STEP_COST_USD`, default 1.50 in `src/lib/pundit/model-cost.ts`), repair rounds default two with a ceiling of ten (`PUNDIT_MAX_ATTEMPTS`), a stub model that refuses a publishing posture, prompt caching, per-drop cost recorded on `daily_drops`, and a one-pundit, one-attempt diagnostic path. The judge model was moved to Haiku 4.5 in the production environment on 2026-09-06 as an unverified quality bet (`docs/06-ops.md`).
- **Built but not live** (flags false): new checkout, prediction registration, forecast training, public forecast scores, evaluation runs, release snapshot writes, legacy on-demand narration.
- **Known product gaps** (`docs/product-state.json`, `currentGaps`): Teams does not enforce the Premier-League-only beta; `/receipts` still renders the legacy ledger; Settings copy is not fully reconciled.
- **External fact**: the match data provider stopped sending expected goals on 1 September 2026 (`5329ec4`); the pipeline now derives shot quality from inside and outside the box counts instead.

## What changed recently

- 2026-09-07 **A diagnostic run at a tenth of the price** (`adddf64`, #66). The 2026-09-06 run "failed 0/6 and I caused two of the three reasons": a writer rule demanding a percentage the number gate then refused. Per-call logs priced the run at 2.14 US dollars and killed the assumed optimisation: batching judges saves input, and "input is a fifth of the judge bill". Levers now: `?pundits=` writes a subset, `&attempts=` lowers repair rounds, a passing judge writes only its score, and the calibration harness no longer reports an API outage as an editorial verdict ("A confident wrong conclusion is the most expensive thing this project produces").
- 2026-09-06 **Six faults from the Liverpool run, all ours, all found for free** (`6dc3dd4`, #65). The claim laboratory "returned thirty five claims holding about ten ideas", so six pundits wrote one script and five failed as a truism; claims are now deduplicated (thirty-five collapse to sixteen). Form had no lower bound and presented a nine-month-old draw as a run; it is windowed at sixty days. Entity licensing refused four pundits for naming teams the pack had handed them: "Showing a writer a name and then refusing it is a trap rather than a gate." `preferredClaimTypes` had been in every spec since they were written and "read by nothing".
- 2026-09-06 **The judges were told what a four is** (`20d5672`, `5ed4712`, `80306a8`, #62 to #64). A calibration harness judges a published script and a professional match report against the same sealed evidence. First run: the one published show, judged 12/12 before the written standards merged, scored 3/12 after; two professional reports averaged 1.7 on ten craft dimensions. Fix: four is "the standard of a good professional match report, not a flawless one". With anchors the published script went from five of fourteen back to eleven, craft mean 2.8 to 3.7.
- 2026-09-06 **Building on a claim is not the failure; stopping at it is** (`b268c11`, #61). A 2.67 dollar run passed none of six; the independence judge called reproduction what the pack had handed over as truth. Also: "The factual gate was working correctly and I had it wrong."
- 2026-09-06 **Stop paying for the same fact twice** (`fd3169c`, #60). A step hit 71 cents against a 70 cent ceiling because form and head-to-head had doubled the pack (4,993 to 9,742 characters) and every judge call re-reads it, "about a hundred and seventy times per run". Trimmed to 6,909 with the context intact.
- 2026-09-06 **Five of six listeners saw an empty home page while a published show sat behind it** (`407be64`, #59). Per-edition publication meant the Today fallback, which only looked for the listener's own pundit, showed nothing to everyone else. It now falls back to the most recent edition anyone published and names who made it. The Teams page stopped promising a personalised feed it never built, and on-demand narration got its own flag after turning prelaunch off "silently opened a button that ... spends real model and narration money per click".
- 2026-09-05 **Publish the pundits that passed** (`d4bc163`, #47, migration `20260905060000`). "The last full run had one variant clean and five short, and produced nothing." Nothing loosened; a neighbour's failure no longer withholds a pundit that passed, narration runs only for scripts that can publish, and the promise checks say which pundit was withheld and why. Same PR: a free preflight of everything a paid run needs, and narration rehearsal against a stored script because "eighteen variants exist and not one has an audio url".
- 2026-09-05 **Evidence the writer can actually use** (`c0e2ed8`, `f8734fb`, `5329ec4`, `ebbc35c`, `31cabf6`, #51 to #58). Expected goals left the provider on 1 September: "Sixteen statistics arrive for every fixture and we were keeping nine of them." Shot location is now stored and the inside-box share derived. The pack gained form and head-to-head "already in the database and read by nobody". A share expressed as 0.286 became "under thirty percent" and a hard gate refused thirty; shares are now whole percent. The ingest no longer writes null over a stored statistic the provider stopped sending. The generated Supabase types were missing twenty-five tables.
- 2026-09-05 **Cost guardrails** (`aeb8a20`, `abb6ea1`, `73a4dbf`, `a4a00b7`, #38 to #43). A per-step spend ceiling, a stub model, a repair loop that stops when the failed set does not change ("one pundit failed the same three beats on attempt one and attempt three"), per-drop cost recorded, prompt caching ordered so twelve judges share a prefix, and default repair rounds cut from six to two because "a run nobody had configured spent three times what it needed to, silently".
- 2026-09-05 **Structural faults that cost paid runs** (`51a5c25`, `ce44014`, `f3e2f79`, `8847453`, `ae564f9`, #33 to #53). A durable run replayed stale steps, so "several runs I read as clean tests were mixtures of old and new code". `harness_runs` capped attempt at three after the generator allowed six. One unreadable judge ended a whole run. A stub-driven test now walks all six pundits through the writing path in under a second. Verify CI had been red for weeks on a dependency advisory: "CI that is always red reports nothing."
- 2026-09-05 **Gates misreading correct scripts** (`298f244` to `000826d`, #24 to #48). "four" matched inside "twenty-four"; "two point eight three" read as an eight and a three; "per claim c4" read as an unlicensed 4; a claim that "names five players and cites five events" said four substitutions; an own goal read as the wrong team's player. Every misread is frozen in a regression corpus (`38e759f`) so the next gate change is checked for nothing.
- 2026-09-04 **Founder launch override** (`8928687`). Readback showed the 04:45 cron returning 409 on the rehearsal flag, no voice or lexicon rows, and `release_state` never enabled, "so publish_daily_drop() could not publish". The override migration, self-seeded voices with a founder attestation, and pronunciation measured against the verified transcript made automatic publication possible.
- 2026-08-11 **Pundit-first daily show and the handbook** (`729c8e5`, `c782d1c`, `f52eb45`): the player-first Today, six selectable AI Pundits, `product-state.json` and the go-to-market agent manual.
- 2026-08-08 **Six-persona launch system** (`ed5b1fb`): evidence-licensed claims, independent gates, prediction receipts, six narration pipelines, durable workflows, fail-closed release controls.

## What is next and what is waiting on Krish

- Next in the repo's own order (`docs/19-release-state.md`, "Next product sequence"): Premier-League-only Teams, replace `/receipts`, Settings copy, then the waived gates in order of listener impact.
- Waiting on Krish: run the judge calibration against the published script before trusting Haiku 4.5 as the judge in publication mode (`docs/06-ops.md`).
- Waiting on Krish: `docs/06-ops.md` and `src/workflows/daily-pundit.ts` say a subset diagnostic run "can never publish". The code says otherwise: `publish_daily_drop()` publishes any drop with at least one clean variant and `promise-checks.server.ts` passes with one. A one-pundit diagnostic in the production posture can publish a one-pundit drop. Decide whether that is intended.
- Waiting on Krish: the commercial docs (`docs/07-marketing.md`, `08-sales.md`, `10-support.md`, `21-go-to-market-agent.md`) still say pre-launch. The steward does not change commercial wording; `docs/product-state.json` `commercialState` is the current position.

## Read next

1. `docs/product-state.json`: machine-readable shipped behaviour, gaps, commercial state and claim boundaries. Moves with the prose.
2. `docs/00-product.md`: doctrine, evidence contract, launch standard.
3. `docs/18-world-class-pundit-system.md`: what the repository implements and where.
4. `docs/19-release-state.md`: live readback, the override, waived gates, go-live sequence.
5. `docs/06-ops.md`: schedules, what a run costs, judge calibration, failure guide.
6. `docs/12-roadmap.md`: remaining work and the dated decision log, including the override.
7. `docs/README.md`: the index and authority order.
8. `docs/13-agent-handoff.md`: how an agent starts here safely.

## Do not trust

- `docs/07-marketing.md`, `docs/08-sales.md`, `docs/10-support.md`, `docs/21-go-to-market-agent.md`: every "pre-launch" and "free during pre-launch" is from 2026-08-11. The state since 2026-09-04 is live beta; the commercial position is `docs/product-state.json` `commercialState`. Awaiting Krish's rewrite.
- `docs/06-ops.md`, "Levers", item 1, and the comment on `punditIds` in `src/workflows/daily-pundit.ts`: the claim that a subset run cannot publish is contradicted by `publish_daily_drop()` and `promise-checks.server.ts`. Flagged above.
- The environment blocks in `README.md` ("Safe defaults") and `docs/18-world-class-pundit-system.md` ("Safety switches") are the `.env.example` local defaults, not the production posture. The production baseline is `docs/06-ops.md`, "Default posture".
- `docs/14-build-plan.md` and `docs/15-access-and-waitlist-plan.md`: Historical since 2026-08-11 by their own headers; indexed in `docs/history/LOG.md` on 2026-09-07.
- `docs/16-ask-your-pundit.md`: a proposal, not a shipped feature.
- `.lovable/plan.md`: a tool artifact from the prototype period, not documentation.
