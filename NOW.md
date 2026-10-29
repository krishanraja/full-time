---
repo: krishanraja/full-time
product: Full Time
as_of: 2026-10-29
head: 88378a1
lifecycle: beta
production_url: https://fulltime.fm
state_doc: docs/19-release-state.md
history_log: docs/history/LOG.md
truth_files: [docs/product-state.json]
authority_order: [code and migrations and live readback, docs/product-state.json, docs/00-product.md, docs/18-world-class-pundit-system.md, docs/19-release-state.md, the role-specific current guide in docs/README.md, historical and proposed records never direct current work]
steward: https://github.com/krishanraja/ai-harness/blob/main/docs/steward/RUNBOOK.md
never_publish: [the product name Full Time and the domain fulltime.fm, the sport (football) and any league or competition, any team or player or fixture named in this repo or its commits, the match data providers (API-Football and football-data), the voice vendor (ElevenLabs), the Supabase project id, any credential or environment variable name, the six AI Pundit names, the Google Drive folder id and Drive folder name used for private evidence intake, the names of the evidence-intake secrets]
---


# Full Time: where it is right now

The solo pundit alpha is mid-build and none of it is proven on listeners or in published audio. Merged 2026-10-27 (PR #102, `ce10e52`): the alpha format (120-180 seconds per recording), spoken-first standards in shared speech `1.1.0` and six profile `1.1.0` files, a numeric gate that accepts pack-licensed spoken decimals, and checks for post-match table figures narrated as pre-match context and for invented substitute-to-substitute goals. Details: `docs/25-personality-system.md`, `docs/24-listening-standard.md`, `docs/26-alpha-readiness-handoff.md`.

Editorial quality is unproven. The 27 October paid Gaffer diagnostic (16 calls, $0.4138398 local usage) passed all eleven deterministic gates and was quarantined by factual entailment, insight and restraint. No new model or audio call has tested the revised instructions, and both paid approvals are spent. Last local verification (27 October): 609 tests passed, two skipped; typecheck, documentation and persona checks passed. No deployment, publication or audio generation occurred. The longer 26 to 27 October narrative is in `docs/history/LOG.md` under 2026-10-27.

## What it is

Full Time turns one set of checked football facts into six complete audio shows, each written, argued and performed by a different AI Pundit. One real Premier League match a day becomes a sealed evidence pack; a claim laboratory licenses what can be said about it; six persona writers (Opus) each produce a ten-beat script; twenty-five named harnesses per edition (deterministic licence gates plus twelve independent qualitative judges) decide whether it publishes; a synthetic voice narrates it, transcription and loudness checks verify the audio, and `publish_daily_drop()` puts each edition that passed in front of listeners. Today shows that one match on one screen, with crests, the score and the six AI Pundits as a rail, and the whole app is a no-scroll experience (Ruling, Krish, 2026-09-27). A TanStack Start app on Vercel, Supabase behind it, built and run by one person. The product doctrine is `docs/00-product.md`; the implementation map is `docs/18-world-class-pundit-system.md`.

## Who it is for and why it matters for Mindmake

Full Time is a B2C product for football fans, in a pilot beta, with public release targeted for December 2026 (Rulings, Krish, 2026-10-16). It sits inside Mindmake as a B2C monetisation experiment, priority 1 on the Control Center ladder (Ruling, Krish, 2026-10-06: "a b2c monetization experiment app"; "ready for pilot users"). The listener is a Premier League fan who already knows the score by breakfast and wants a sharper way to talk about the match. The beta's question is whether those fans come back on their own; whether they would pay comes after December. Why it exists, where it is going, the three tester questions and the December bar: `docs/22-vision-and-beta.md`.

It is also proof, and that part survives anonymisation. The room_face buyer (`control-center/docs/ICP.md`: a senior leader at a PE or VC backed media, adtech, publishing or data business, quietly behind on what is coming) is being told that AI will remake editorial production. This repo is one person doing it end to end, in public, with the failures left in the commit log:

- **An editorial standard you can run, not a style guide.** Publication is gated by twelve qualitative dimensions at four out of five plus deterministic fact, number and entity licences. The 2026-09-06 calibration work found the bar had drifted to a place that "rejects the show it published and rejects the professional press", and fixed it by stating in writing what a four is. That is the argument for judges with written standards over taste.
- **The cost of a show is a number, per show.** A six-pundit run was measured at 2.14 US dollars of model spend (writer 1.06 across twelve calls, judges 0.99 across eighty-four), recorded per drop in the database, with a per-step spend ceiling that stops a run. "The bill is output tokens, not input." That is a Money of AI story about where the money in AI content actually goes.
- **Publish what passed, withhold what did not.** Six independent standards had been compounded into one all-or-nothing gate and "the last full run had one variant clean and five short, and produced nothing." The fix changed the publication boundary without loosening a single gate.
- **The failures were the operator's, found by reading what the run stored.** Six pundits failing the same harness meant one shared input, not six bad writers: a claim laboratory that returned thirty-five claims holding about ten ideas, a form lookup with no lower bound, a licence that refused names the pack itself displayed. That is the honest version of "AI in production" a media leader will not hear from a vendor.

Objection it answers: "AI-generated editorial cannot be held to a standard." Here is one held to twenty-five of them, daily, with the ledger open.


## Where it is right now (as of 2026-10-29)

<!-- north-star-state {"week_of": "2026-10-26", "week_target": 10, "current": 0, "current_as_of": "2026-10-27", "current_source": "Supabase FullTime listens HEAD count=exact, Content-Range */0", "urgency": 4, "urgency_reason": "at 0% of this week's target"} --> **North Star number: U4, far behind.** Listeners who come back within the same week: 0, against 10 this week, on the way to 10,000 by 31 May 2027. A bold swing every day; work that does not move the number waits.

- **Alpha handoff:** `docs/26-alpha-readiness-handoff.md` records the solo spoken-review decision, the failed paid diagnostic, the two API feeds and the GitHub collection failure. The two newest scheduled intake runs observed on 2026-10-27 were partial with no Drive delivery; refresh from GitHub before relying on that.
- **Evidence intake v2:** adapter enabled and production-verified on 2026-10-20 (ten matches, 394 facts, 116 measurements consumed, four disputed observations withheld, no model calls). Proof and rollback: `docs/premier-league-evidence-actions.md`.
- **Pilot beta, December target, one feedback inbox** since 2026-10-16 (Rulings, Krish; `docs/22-vision-and-beta.md`). No tester has been invited; nobody has confirmed the `utm_source=beta` tag reaches PostHog.
- **Live at fulltime.fm** as a beta by founder override (2026-09-04): three tabs, six AI Pundits free, Premier League only, one match, no scroll. Last live readback in `docs/19-release-state.md` is 2026-09-04; nothing here confirms production flags since. The TanStack XSS patch (`5894eca`) is in the tree and unread on production.
- **Publication is per edition** since 2026-09-05; a drop publishes each edition that passed all gates. How many of the six published on any day is a database fact this reconciliation could not read.
- **Cost controls are live in code:** per-step spend ceiling, repair-round limits, prompt caching, per-run spend on `editorial_runs.promise_checks.spend` (`docs/06-ops.md`). The writer and judges run on OpenAI models while the Anthropic cap bridge stands (`docs/06-ops.md`).
- **Built but not live** (flags false): checkout, prediction registration, forecast training, public forecast scores, evaluation runs, release snapshot writes, legacy on-demand narration. Gaps: `docs/product-state.json`, `currentGaps`.
- **Unproven:** the league table, drift ledger and second expected-goals opinion are wired and empty until an ingest runs against them; the match data provider stopped sending expected goals on 1 September 2026 (`5329ec4`).

## What changed recently

- 2026-10-27 **A paid solo diagnostic passed every mechanical gate and still failed on facts, so the alpha was re-aligned to spoken quality and an evidence handoff** (`ce10e52`, PR #102; `docs/26-alpha-readiness-handoff.md`). The 385-word Gaffer script cleared all eleven deterministic gates, then was quarantined by factual entailment, insight (3/5) and restraint (3/5): the claim lab invented that both the late scorer and assister were substitutes, and the script and reviewer used an after-match table as if it described both teams before kickoff. The fix added checks for those two errors, a 120-180 second alpha format, shared speech and profile `1.1.0` files, and a numeric gate for exact pack-licensed spoken decimals. The commit does not claim better writing.
- 2026-10-23 **The North Star now has a number, a weekly ladder and an urgency rating** (Ruling, Krish, 2026-10-23). Every repository chases one aggressive number on a weekly ladder, and urgency U1 to U5 sets intensity. See `docs/NORTH_STAR.md`.
- 2026-10-22 **The Reporter now writes to be heard, and a listening standard separates "passed the gates" from "sounds right"** (PR #95; `docs/24-listening-standard.md`). The failure it answers: automated editorial and audio success had been read as listening approval. Not verified: the production narrator does not yet reproduce the approved take B.
- 2026-10-21 **A public answer hub and a true-size brand set exist in the tree** (`c499a0a`, PR #94). The favicons and icons "were five copies of one 2000x2000 PNG (145 KB each)"; each is now its true size. Five seed posts, `llms-full.txt` and an Atom feed were added; the hub is deliberately unlinked from the app's navigation (`docs/23-answer-hub.md`). Dev-server readback only, model spend $0.
- 2026-10-21 **A concise Reporter edition was enabled** (`864a8fa`, `322fd11`, PRs #92 and #93). Ruling (Krish, 2026-10-21): run one final review within USD 0.35, then narrate and publish if it passes. Whether that edition published is a production fact not observed here.
- 2026-10-20 **The evidence intake was read back through the live product, and the readback found four disagreements that were withheld rather than settled** (PRs #88 to #91). Provider numbers for two blocked-shot counts and both possession percentages differed from the archived ones; both observations and dependent calculations were withheld. Model spend: $0.
- 2026-10-19 **A scheduled evidence intake runs on GitHub Actions and the app names the companies behind it** (PRs #84 to #86). The first live run found what mocked tests could not: a fixture feed returning HTTP 404, a missing key, and a Drive 403 with no reason. Ruling (Krish, 2026-10-19): the files are internal-only. Mindmaker LLC and Mindmaker Ltd now appear in the footer note, terms and privacy.
- 2026-10-18 **The repo gained a North Star and a harness canon block; no product behaviour changed** (PRs #81 and #82). Model spend: $0.
- 2026-10-16 **The docs described a contract, not a product, and had no room for testers.** Krish ruled a B2C pilot beta, a December release target with a written bar, and krish@fulltime.fm as the feedback inbox (`docs/22-vision-and-beta.md`). Model spend: $0.
- 2026-10-03 **The podcast feed's contact address moved to the Mindmake domain** (`8f1c95b`, PR #75; Ruling, Krish, 2026-10-03). It merged with only the `pnpm audit` step red on an advisory with no published fix; "No gate was weakened."

Earlier bullets (2026-09-27 to 2026-10-02: Premier League only, Google Analytics, the premium visual system, the XSS patch, the play-button fix) are archived verbatim in `docs/history/LOG.md` under 2026-10-29.

## What is next and what is waiting on Krish

- Next: diagnose the scheduled intake failures `39781515115` and `40195599277`, restore two-source corroboration, verify both Drive hashes and live adapter consumption, then use an eligible sealed pack for one sharp solo review (`docs/26-alpha-readiness-handoff.md`). A further paid run needs a new exact approval from Krish in chat.
- Waiting on Krish: the questions archived in `docs/history/LOG.md` under 2026-10-29: the RSS `itunes:owner` address, whether a subset diagnostic run may publish (`docs/06-ops.md` says it cannot; the code says it can), the standings licence basis, and whether the OpenAI judge posture outlasts 2026-10-01.
- North Star check (2026-10-27): holds.

## Read next

1. `docs/NORTH_STAR.md`: the ambition Krish set that is not reached yet. Read it first, every session; only Krish changes it.
2. `docs/22-vision-and-beta.md`: why Full Time exists, where it is going, the pilot beta, and the December release bar.
3. `docs/product-state.json`: machine-readable shipped behaviour, gaps, commercial state and claim boundaries. Moves with the prose.
4. `docs/00-product.md`: doctrine, evidence contract, launch standard.
5. `docs/18-world-class-pundit-system.md`: what the repository implements and where.
6. `docs/19-release-state.md`: live readback, the override, waived gates, go-live sequence.
7. `docs/06-ops.md`: schedules, what a run costs, judge calibration, failure guide.
8. `docs/12-roadmap.md`: remaining work and the dated decision log, including the override.
9. `docs/README.md`: the index and authority order.
10. `docs/13-agent-handoff.md`: how an agent starts here safely.
11. `docs/premier-league-evidence-actions.md`: the scheduled private evidence intake, its secrets by symbolic name, failure modes and cutover.
12. `docs/23-answer-hub.md`: the `/answers` hub, its quality bar, sourcing and weekly cadence.
13. `docs/24-listening-standard.md`: what passes as spoken writing and delivery, the bounded production sequence, and how an approved recording is imported.

## Do not trust

- `docs/06-ops.md`, "Levers", item 1, and the comment on `punditIds` in `src/workflows/daily-pundit.ts`: the claim that a subset run cannot publish is contradicted by `publish_daily_drop()` and `promise-checks.server.ts`. Flagged above.
- The environment blocks in `README.md` ("Safe defaults") and `docs/18-world-class-pundit-system.md` ("Safety switches") are the `.env.example` local defaults, not the production posture. The production baseline is `docs/06-ops.md`, "Default posture".
- `docs/14-build-plan.md` and `docs/15-access-and-waitlist-plan.md`: Historical since 2026-08-11 by their own headers; indexed in `docs/history/LOG.md` on 2026-09-07.
- `docs/16-ask-your-pundit.md`: a proposal, not a shipped feature.
- `.lovable/plan.md`: a tool artifact from the prototype period, not documentation.
- `docs/06-ops.md`, "What a run costs" table: it names the judge model as Sonnet 4-6. The commit record (`00952d4`) says the bench that actually published this product's show was Haiku 4.5, read from the code default rather than the environment. The $2.14 total stands as measured; that one model name does not.
