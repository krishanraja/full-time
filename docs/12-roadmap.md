# 12 - Roadmap and decisions

- **Status:** Current
- **Owner:** Founder and product
- **Purpose:** Show what remains, what is deliberately deferred, and which product decisions govern the work.
- **Last reviewed:** 2026-09-27

## Current objective

Prove, in public, that all six AI Pundits are consistently useful, distinct, funny, evidence-grounded, and listenable. Since the founder launch override of 2026-09-04 ([`19-release-state.md`](./19-release-state.md)) that proof happens on the live beta rather than before a launch.

Today and the three-tab shell are live at fulltime.fm, and the 04:45 UTC workflow publishes every AI Pundit edition that passes its automated checks (migration `20260905060000_publish_the_variants_that_passed.sql`). Premier League only Teams, a one-match Today, the no-scroll frame, and the Settings screen shipped in code on 2026-09-27 (decision log below). The immediate implementation gaps are the quiet settled-only track record, which has no in-app entry, and the language pass on metadata, legal copy, sitemap, and machine-facing docs. The external critical path, licensed inputs, forecast proof, founder-approved scripts and voices, blind listener results, seven rehearsals, and revision-bound sign-offs, was waived as a launch condition by the override and remains open work.

## Workstreams

| Workstream                     | Engineering           | Evidence/approval                                          | Current result               |
| ------------------------------ | --------------------- | ---------------------------------------------------------- | ---------------------------- |
| Truthful public state          | Complete and deployed | Ongoing regression review                                  | Live beta                    |
| Player-first Today             | Complete and deployed | Physical-device and live-data regression review            | Live beta                    |
| Premier League Teams beta      | Complete (2026-09-27) | Read back the twenty clubs on the matching deployment      | Premier League only          |
| Quiet settled track record     | Partial               | Replace legacy `/receipts` search and open-call behavior   | Unlisted, no in-app entry    |
| Settings language              | Settings screen done  | Metadata, legal copy, sitemap, machine-facing docs         | Needs copy pass beyond Settings |
| Evidence and claim licensing   | Complete              | Evaluation corpus must prove it                            | Gate waived 2026-09-04; open |
| Six persona systems            | Complete              | Blind identity and founder taste thresholds                | Gate waived 2026-09-04; open |
| Humour and editorial harnesses | Complete              | 360-script and human review                                | Gate waived 2026-09-04; open |
| Narration and mastering        | Complete              | Licensed casting, quota, pronunciation, full-length panels | Gate waived 2026-09-04; open |
| Forecasts and receipts         | Complete              | Two-season backfill and held-out baseline win              | Scores private               |
| Durable daily operation        | Complete              | Seven consecutive on-time rehearsals                       | Publishing per edition since 2026-09-05 |
| Legal, privacy, accessibility  | Controls present      | Revision-bound professional sign-off                       | Gate waived 2026-09-04; open |
| Billing                        | Retained but disabled | Separate product and legal decision                        | Not in launch scope          |

The sequence below was written before the 2026-09-04 override. Steps 2 to 6 remain the order in which the waived gates are worked after launch; the launch decision in step 7 has been taken and is recorded in the decision log.

## Delivery sequence

### 1. Finish the beta surfaces

- Done 2026-09-27: Teams lists the twenty clubs of the current Premier League season, with no league row and no coming-later leagues (the three-team prompt went on 2026-09-06). Old non-Premier-League follows stay stored outside the count.
- Replace `/receipts` with settled-only `How did they do?` cards and optional defined detail, and give it an entry in the product again.
- Reconcile metadata, legal copy, sitemap, and machine-facing docs to AI Pundit language. Settings was done on 2026-09-27.

### 2. Rights and data

- Confirm licensed structured-data coverage and two-season history.
- Build the research-source whitelist with permission, use, attribution, and expiry.
- Approve original concept cards and test the corpus for overlap.
- Complete the human-verified launch pronunciation list.

### 3. Forecast proof

- Backfill history in bounded batches.
- Train without activation.
- Compare against league base rates on held-out data.
- Activate and expose scores only after a documented win.

### 4. Editorial proof

- Founder approves the 60-match set and anti-examples.
- Run all 360 persona scripts with frozen harness versions.
- Collect blind fan and analyst comprehension, preference, persona, humour, and quality scores.
- Repair failed layers without lowering thresholds.

### 5. Voice proof

- License at least two full-length candidates per pundit.
- Run identical held-out scripts blind.
- Verify authority, naturalness, timing, listenability, persona identity, and name accuracy.
- Record founder selections and capacity of at least 1.5 million approved characters per month.

### 6. Operational proof

- Enable private rehearsals only.
- Complete seven consecutive six-variant days before the UK deadline.
- Verify player, transcript, artwork, share card, RSS, receipts, monitoring, and rollback every day.
- Record failures visibly; never substitute personas.

### 7. Launch decision

- Record legal, privacy, accessibility, editorial, audio, forecast, monitoring, rollback, and feed sign-offs against one revision.
- Store a passing release snapshot.
- Verify a preview, then perform a controlled production rollout.
- Public launch and billing remain separate decisions.

## After launch, not before

- Ask Your Pundit, subject to [`16-ask-your-pundit.md`](./16-ask-your-pundit.md).
- Additional leagues and competitions with licensed evidence and evaluation coverage, by a new founder decision: the 2026-09-27 ruling makes the product Premier League only.
- Deeper personalization and account sync.
- Sponsor or membership experiments that preserve editorial independence.
- Richer tactical claims only after licensed film or tracking evidence and new gates.

## Deliberately out of scope

| Idea                          | Reason                                                |
| ----------------------------- | ----------------------------------------------------- |
| Live commentary               | Different rights, latency, and safety product         |
| Betting integration           | Conflicts with brand and prediction integrity         |
| Living-pundit imitation       | Trust, rights, and originality risk                   |
| Comments/community            | Moderation burden and diluted morning-show focus      |
| Six podcast feeds             | Fragments subscribers, reviews, charts, and analytics |
| Required account              | Breaks the immediate-listening promise                |
| Unlicensed tactical certainty | Current data cannot prove it                          |
| Paid launch gate              | Product quality, not checkout, defines readiness      |

## Decision log

Use: **Decision - Context - Tradeoff - Reversible?** Add new entries at the top.

### 2026-09-27 - Premier League only, one match, no scroll

- **Decision:** Four rulings (Krish, 2026-09-27). Premier League teams only, across the whole product. Today shows one match at a time, says plainly which game it is, and carries one select novelty element: the six AI Pundits for that match as a rail. The app is a completely no-scroll experience. Club crests are shown from the data provider's public imagery, accepting the trademark exposure ("I accept exposure, we are just using public imagery"); the Premier League's own mark is still not used and the competition is named in text only.
- **Context:** Krish: "This whole product is supposed to be for Premier League teams only but the settings show different teams." Today was "so hard to figure out what game I'm looking at. It's just full of verbal diarrhoea and trying too hard to be cool. It just needs to show what game it is and maybe then something like one really select thing that shows its novelty. It's also supposed to be a completely no-scroll experience in this whole entire app." The daily pick had no league filter: the 2026-08-31 published show was Barcelona v Rayo Vallecano and 2026-09-03 picked Toulouse v Lille. Today's fallback ordered by publication time and widened to any match, so four of six AI Pundits opened on Tottenham v Aston Villa (19 September) while the newer Man City 5-3 Sunderland (20 September) sat in a list below.
- **Tradeoff:** A day without a finished Premier League match publishes nothing; it fails selection before any paid step, so it costs nothing. The ingest and prediction sync pull the Premier League only. The published La Liga edition stays in the database and no longer reaches Today. Today loses the model-written headline and dek, the More to play list, and the How did they do? entry, so `/receipts` has no in-app entry. Crests carry a trademark exposure the founder accepted knowingly. Legacy direct-URL routes still scroll inside the screen region until they are re-laid-out.
- **Reversible?** Yes. A league comes back through `src/lib/premier-league.ts` and the ingest, by a new founder decision; crests come out through `src/components/ClubCrest.tsx`; the frame and Today layout are layout. This entry supersedes the league-visibility part of the 2026-08-11 decision "Premier League first, staged personalization" below: there are no coming-later leagues and no league rows. The crest ruling overrides the prohibition on club crests without recorded permission in [`11-legal.md`](./11-legal.md) and [`01-brand.md`](./01-brand.md); league and broadcaster marks stay prohibited. Recorded from the code and commit record on 2026-09-27.

### 2026-09-05 - Publish the pundits that passed

- **Decision:** A daily drop publishes every AI Pundit edition that passed all of its own gates and withholds the ones that did not. A drop with no clean edition still fails.
- **Context:** Every gate is per edition. Requiring all six to clear every gate at the same moment compounded six independent standards into one, and the last full run before the change had one clean edition and five short and produced nothing (migration `20260905060000_publish_the_variants_that_passed.sql`, commit `d4bc163`).
- **Tradeoff:** On a day their own AI Pundit was withheld, a listener is offered another AI Pundit's edition, named as such. No gate was loosened.
- **Reversible?** Yes, by migration. Recorded by the docs steward on 2026-09-07 from the code and commit record.

### 2026-09-04 - Launch by founder override

- **Decision:** Launch the live beta before the external launch gates are met. Migration `20260904120000_founder_launch_override.sql` records the override gate snapshot and the waived gates; [`19-release-state.md`](./19-release-state.md) lists them.
- **Context:** Live readback on 2026-09-04 showed the ingest healthy and the six-variant workflow never admitted past its flag check (commit `8928687`).
- **Tradeoff:** Editorial, voice, rights, rehearsal, forecast, legal, and accessibility sign-offs become open work after launch rather than conditions of it. The automated evidence, harness, transcript, audio, and publication checks stay enforced on every edition.
- **Reversible?** Yes: set release state to `paused` and turn the publication flags off ([`06-ops.md`](./06-ops.md), Rollback). This entry overrides the 2026-08-08 decision "Launch by evidence, not date" below, which is kept as the record of the standard the product is still held to. Recorded by the docs steward on 2026-09-07.

### 2026-08-10 - One documentation hierarchy

- **Decision:** Product doctrine, implemented system, and release state are the three governing documents. Historical plans cannot override them.
- **Context:** Old role guides carried contradictory legacy instructions under warning banners.
- **Tradeoff:** Historical detail is summarized rather than repeated throughout current docs.
- **Reversible?** Yes, but multiple competing truth sources are prohibited.

### 2026-08-08 - Six minds, not six voices

- **Decision:** One evidence base produces six separate theses, scripts, humour systems, performances, and prediction ledgers.
- **Context:** Presentation-only personas could not deliver meaningful choice or product differentiation.
- **Tradeoff:** Sixfold editorial and narration cost, plus a much larger evaluation burden.
- **Reversible?** Technically, but it would remove the core proposition.

### 2026-08-08 - Prediction and accountability as proof

- **Decision:** Register forecasts before kickoff and publish immutable receipts, including wrong calls.
- **Context:** Retrospective punditry can explain any result after the fact.
- **Tradeoff:** Public mistakes and an ongoing calibration obligation.
- **Reversible?** No without breaking trust in the record.

### 2026-08-08 - Launch by evidence, not date

- **Decision:** No public date until every editorial, narration, forecast, operational, legal, accessibility, and human gate passes.
- **Context:** Safe but generic output is not a launchable product.
- **Tradeoff:** Longer private verification and no schedule-based pressure release.
- **Reversible?** Only through a new founder decision that accepts the identified risk.
- **Overridden:** 2026-09-04, by the founder decision recorded above. The standard itself is unchanged and lives in [`00-product.md`](./00-product.md).

### 2026-08-08 - Free pundit choice and billing off

- **Decision:** All six pundits are free during pre-launch; new checkout and Pro claims are disabled.
- **Context:** Persona quality and choice need broad evaluation, while the paid value proposition is not approved.
- **Tradeoff:** No near-term subscription revenue.
- **Reversible?** Yes, after a separate post-readiness product and legal decision.

Older June and July plans are retained in [`14-build-plan.md`](./14-build-plan.md) and [`15-access-and-waitlist-plan.md`](./15-access-and-waitlist-plan.md) as historical records.

### 2026-08-11 - AI-native, player-first product

- **Decision:** Full Time should feel valuable because it is AI. Today opens on the playable show, and the six public products are called AI Pundits.
- **Context:** The prior surface felt like a serious product-marketing page and too closely resembled a conventional human podcast.
- **Tradeoff:** The product must visibly own synthetic production while keeping the factual and rights boundary unusually strict.
- **Reversible?** The layout is reversible. The AI-native positioning is current product doctrine.

### 2026-08-11 - Three-tab shell

- **Decision:** Public navigation contains Today, Teams, and Settings. `/feed` redirects to Today, and the track record remains unlisted.
- **Context:** Feed and Receipts duplicated or distracted from the player-first experience.
- **Tradeoff:** Archive, RSS, and track-record discovery depend on contextual links instead of permanent tabs.
- **Reversible?** Yes, if observed demand later earns another destination.

### 2026-08-11 - Premier League first, staged personalization

- **Decision:** The intended beta is Premier League first. Other leagues appear as coming later. Saved teams may affect approved ordering only when exact metadata supports it; personal show generation is deferred.
- **Context:** Broad league choice implied coverage and personalization the pipeline could not yet approve.
- **Tradeoff:** Narrower beta scope and preserved but hidden non-Premier-League follows.
- **Reversible?** Yes, after data, evaluation, and production coverage expand.
- **Overridden:** in part, 2026-09-27, by the Premier League only decision above. Other leagues no longer appear as coming later; Teams shows the Premier League clubs alone. Preserved non-Premier-League follows and staged personalization stand.

### 2026-08-11 - Quiet accountability

- **Decision:** Accountability appears as `How did they do?` only for settled records. No user predictions, odds, betting actions, or open pre-match calls belong in the primary product.
- **Context:** The old receipt ledger read like a betting or performance dashboard and pulled focus from listening.
- **Tradeoff:** Less visible forecasting detail and fewer filters until enough settled records exist.
- **Reversible?** The presentation is reversible. The no-betting boundary is not. The direct `/receipts` route remains to be replaced.
