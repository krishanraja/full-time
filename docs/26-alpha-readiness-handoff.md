# Alpha readiness: session closeout and next work

**Recorded 27 October 2026.** This is a continuation route, not a claim that
alpha is ready. Start with `AGENTS.md`, `docs/NORTH_STAR.md`, `NOW.md`, then this
page. For implemented and live facts, use the source-of-truth order in
`docs/README.md` and recheck dated observations. Product doctrine is
`docs/00-product.md`; personality ownership is `docs/25-personality-system.md`;
the feed contract and receipts are in `docs/premier-league-evidence-actions.md`.

**Portable private working archive:** the [Product Build Drive
folder](https://drive.google.com/drive/folders/19PDsdoujjtiqFwok-Kp91CT8Ez4lmUrn)
contains [the 27 October session ZIP](https://drive.google.com/file/d/1Shfp1syYVV3w6EMv9nnaPrs2UVbZl2B_/view),
which carries 110 local session files and the ignored product personality
continuation files. Its `START-HERE.txt` and `MANIFEST.json` use relative paths
and per-file SHA-256. The uploaded file's local SHA-256 was
`8af121282ced697ebdc8d564969bd348e3cea17be3c0df67a22a5822336c15fa`;
Drive metadata readback confirmed 30,604,552 bytes in the requested folder.
Fetch and verify the ZIP before using its contents. The repository supplies
code and decisions; this Drive folder is the portable archive of local working
evidence. Its sharing is deliberately left as Krish requested. Treat the
sealed packs, audition recordings and paid responses inside as working
evidence, never as public release assets.

## The product Krish has chosen

**Ruling (Krish, 2026-10-26):** Alpha gives a fan one selected AI pundit's
quick, sharp review and opinion on one Premier League match. Aim for a
120–180-second recording about the game and *why* events happened. The pundit's
character is an analytical lens, not the subject of the show. Each spoken
sentence must work on first hearing with ordinary delivery: clear referents,
direct comparisons and one connected line of reasoning. The earlier Gaffer
draft sounded like written prose and relied on unusual intonation; the revised
spoken draft was "much better". Preserve that improvement in every future
writer, reviewer and listening pass.

**Ruling (Krish, 2026-10-26):** Pundit conversations are a later paid feature,
after reliable solo quality and adoption. They are outside the alpha critical
path. Advertising and organic content have a separate brief: blunt, hilarious
and shareable. Do not move that register into the product review. The growth
session owns the two ad creatives; this repository owns the product baseline.

## What this session built and proved

- The local release candidate `product-personas-2026-10-26.3` coordinates the
  shared spoken policy, six versioned profiles, writer, deterministic length
  gate, audio duration and publication eligibility. New recordings must be
  120–180 seconds; Reporter drafts are 420–500 words, other profiles 330–450.
  The ten stored beat fields are internal structure, not audible headings.
  The writer no longer owes a joke, catchphrase or unsupported forecast.
- A paid, private Gaffer diagnostic on a sealed Tottenham–Coventry pack used
  16 Messages calls and **$0.4138398 exact local model usage**. Its 385-word
  script passed 11 deterministic gates, then was quarantined: the claim lab
  and writer misidentified scorer and assister as two substitutes, and script
  and reviewer treated post-match table points as pre-match context. Insight
  and restraint each scored 3/5. No audio, database write or publication
  followed. Earlier private tests cost $0.095495 and $0.22276125 respectively;
  the first failed claim schema, the second failed length and number gates.
  The three paid approvals are exhausted.
- After that failure, claim and script gates were tightened against these two
  precise temporal/player-role errors. Prompts and factual reviewer explain
  the same boundaries. Synthetic regressions and replay of the failed script
  pass. These checks do not establish general semantic accuracy or improved
  spoken quality. The final local verification before this merge was 609
  tests passed, two skipped; typecheck, documentation and persona integrity
  passed; lint had zero errors and six existing warnings. Re-run on this head.
- A separate 334-word human-written Gaffer v3 is a no-spend first-hearing
  candidate, with source audit. It has not received Krish's listening judgment
  and does not prove that the runtime writer can produce the same standard.
  Private files and sealed pack remain outside Git: see
  `repo/_corpus/personality-system/solo-review-current.json` and
  `session/outputs/fulltime-gaffer-solo-contract-diagnostic` and
  `session/outputs/fulltime-gaffer-solo-review-v3` **inside the Drive ZIP**.
  The original local paths need not exist. No raw licensed pack, audition
  recording or private dialogue belongs in this public repository.

## The two feeds and GitHub collection: current observed state

The product's match ingest uses **API-Football**. GitHub Actions workflow
`.github/workflows/premier-league-evidence.yml` collects three-day windows,
preferring authenticated API-Football fixtures/statistics and requiring an
independent **football-data.org** result cross-check. It creates raw,
normalised and receipt JSON artifacts; complete runs send private snapshots
to Drive. The production adapter can read a sealed, matching window and add
allowlisted measurements to an evidence pack. Collection, Drive delivery,
adapter consumption, factual writing, natural audio and listener retention
are separate proof steps. Data collection does not grant commercial reuse
rights or publish a show.

Historical positive proof (20 October): scheduled-window run
[`39407984999`](https://github.com/krishanraja/full-time/actions/runs/39407984999)
corroborated 10 matches and 394 counted facts/events with Drive hash readback;
the deployed product loader consumed 116 measurements and withheld four
disputed observations. That is evidence for that window, not ongoing feed
health.

**Live GitHub readback on 27 October:** the two most recent scheduled runs
failed safely. [22 October run
`39781515115`](https://github.com/krishanraja/full-time/actions/runs/39781515115)
was partial for 19–21 October: API-Football fixture responses failed schema or
provider validation on all three days; one finished fixture remained single
source, with football-data.org match detail unavailable. [25 October run
`40195599277`](https://github.com/krishanraja/full-time/actions/runs/40195599277)
was partial for 22–24 October: the same API-Football error on all three days,
five single-source fixtures and five unavailable football-data.org details.
Both runs had an accessible Drive preflight but **zero Drive files uploaded**;
the incomplete JSON remained in GitHub artifacts. Their receipts reported
10 and 2 counted items respectively, consisting only of limited single-source
data. Do not use these runs as corroborated input. Provider response detail
and whether the problem is provider, key entitlement, season/date mapping or
our schema handling remain undiagnosed. Inspect exact sanitized response
shape and code path before making a fix; never expose key values.

### Intake diagnosis (13 November 2026)

Read from stored logs, receipts and artifacts only: no provider calls, no model
spend. It supersedes the "remain undiagnosed" sentence above.

**Scope is wider than recorded.** Every scheduled run from run 21 (22 October)
to run 30 (12 November) failed; the last good run is `39407984999` on
20 October. The 12 November run (window 9-11 November) found zero fixtures
and failed with "No complete fixtures verified; cannot treat empty output as
no games", so a week with no matches cannot be told apart from an outage.

**Fault 1: API-Football refuses every fixture call, and the cause is outside
our code.** The 20 October success ran at `21b37d7`, and no commit has touched
`scripts/pl-evidence/` or `.github/workflows/premier-league-evidence.yml`
since. The computed `season` is 2026 on both sides of the break, so season or
date mapping is ruled out. The receipt error proves the provider answered HTTP
200: `requestText` throws `HTTP <status>` for any non-200
(`scripts/pl-evidence/collect.mjs`), while "Invalid API-Football fixture schema
or provider error" is thrown only inside `apiFootballFixtures`
(`scripts/pl-evidence/core.mjs`) after a successful parse, when `response` is
not an array or `errors` is non-empty. That is API-Football's convention for an
invalid key, a plan that does not cover the request, or an exhausted request
quota. Network failure, an HTTP block and a schema change are ruled out. Which
of the three it is cannot be recovered from stored evidence, because the code
discards `payload.errors` and throws a fixed string.

**Fault 2: the fallback cannot replace it, which is the architectural
problem.** The 20 October raw file records 23 `api-football.com` calls (3
fixture lists, 10 statistics, 10 events) and exactly one `football-data.org`
call, the fixture list. `collectMatchDetails` picks its detail branch by
`fixture.source_domain`, so the football-data match-detail path never ran while
API-Football was healthy. When it did run (22 and 25 October), all six detail
calls returned `status: "partial", items: 0` without throwing: the response
carried the right teams and score, which the code checks, but no statistics,
goals or bookings. The most likely cause is the football-data plan's
entitlement; that is inferred, not yet verified. **API-Football is therefore
the single source of every statistic the product uses, and football-data has
only ever corroborated the scoreline.** "Two-source agreement" in this pipeline
means score corroboration, not statistics corroboration. Restoring the
API-Football key alone would hide this again, not fix it.

**Fault 3: the receipt cannot say why a provider refused.** It stores the
generic message only, which is why the fault stayed undiagnosed from
27 October to 13 November.

**What settles the remaining unknowns:**

1. The API-Football dashboard shows whether the key, the plan or the quota is
   at fault. This is free and only Krish can see it.
2. Alternatively, record the provider's sanitized `errors` keys and messages
   (never the key) in `source_status`, then run `workflow_dispatch` once on a
   known-completed window. The intake makes no model calls, so this costs $0
   in API credits; it spends only Actions minutes and provider quota.
3. A real second statistics source needs a paid football-data tier or a
   different provider. That is a spend decision for Krish.

## Relentless next sequence

1. **Restore trustworthy collection first.** The failure is diagnosed (see
   "Intake diagnosis (13 November 2026)"): restore API-Football access, make
   the receipt record the provider's sanitized refusal reason, and decide how a
   second source can supply statistics, not only scores. Run the smallest safe smoke check over a known
   completed Premier League window, then prove two-source agreement, complete
   receipt, both Drive JSON hashes and the live adapter's actual consumption.
   A green workflow or accessible folder alone is insufficient. Keep partial
   runs withheld. The old backup schedule is still a separate cutover decision.
2. **Make one solo review truly good.** Use one eligible, completed Premier
   League match with a sealed, corroborated pack. Replay the current writer
   and hard gates locally before spending; inspect fact lineage, temporal and
   player-role claims, argument specificity and first-hearing clarity. A
   further model or audio call needs a fresh exact cost quote and approval;
   no prior approval carries over. No Control Center approval route for Full
   Time: show the review and any approval request here in the chat.
3. **Listen to the full recording.** Check continuous naturalness, fluidity,
   pronunciation, timing, numerical delivery and whether the analysis would
   make a fan return. Preserve protected older audio. Apply the release and
   rights gates before publication. The writing candidate and deterministic
   test suite cannot certify the listening experience.
4. **Prove the pilot loop.** Only after one review meets the quality bar,
   verify it reaches the intended club-first listener flow and measure same-
   week returning listeners against `docs/NORTH_STAR.md`. The recorded 27
   October value was 0 against 10 for the week (U4); refresh from live listens
   before quoting a new value. The December release bar and tester questions
   are in `docs/22-vision-and-beta.md`.

**Immediate next action:** restore API-Football access once Krish has read
its dashboard (key, plan or quota), make the receipt record the provider's
sanitized refusal reason, restore a corroborated sealed Premier League window, and prove the product
adapter consumes it. Then resume the solo pundit quality loop on that pack.
This sequence is the alpha sprint, not a request for another personality or ad
exploration round.
