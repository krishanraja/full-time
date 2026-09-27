# 00 - Product doctrine

- **Status:** Current
- **Owner:** Founder and product
- **Purpose:** Define the product, its user promise, evidence boundary, and launch standard.
- **Last reviewed:** 2026-09-27

## Product in one sentence

Full Time turns one set of checked football facts into six complete shows, each made and performed by a different **AI Pundit**.

> One real match. Six AI Pundits. Pick the brain you fancy.

The product should feel great because it is AI. It does not try to hide the machine or recreate a human studio. AI makes six full, genuinely different readings of one match practical. Deterministic evidence controls keep the shared facts real and show where those facts stop.

## The first experience

A listener should be able to:

1. open Today without an account or autoplay;
2. see which game it is (competition, date, both clubs with their crests, and the score) and a playable show, all on one screen with no scroll;
3. see the six AI Pundits for that match as a rail, with any that made no show for it dimmed;
4. tap an AI Pundit to hear their show, or step to an earlier or later Premier League match from beside the date;
5. switch safely without losing the playable show when the new edition fails;
6. tap **Show me why** for plain proof behind an important claim, one card at a time.

The interface should feel playful, warm, and obvious to a ten-year-old. Technical rigor belongs underneath the experience, not in the primary vocabulary. Today says plainly which game it is and carries one select element that shows the novelty (Ruling, Krish, 2026-09-27): the rail of six AI Pundits for one match.

## Current product shape

The public shell has three destinations:

- **Today:** one Premier League match at a time, with the match, the six AI Pundits as a rail, the player, and proof in a sheet;
- **Teams:** the route at `/following` for following the twenty clubs of the current Premier League season;
- **Settings:** one card of rows for AI Pundit choice, account, the morning recap, and existing billing management, with the AI disclosure beneath it.

The app is a completely no-scroll experience (Ruling, Krish, 2026-09-27). The document never scrolls: a full-height frame holds the header, the screen, the mini player once a show has started, and the tab bar. Legacy direct-URL routes such as `/receipts`, `/archive`, `/episode/:id`, and the legal pages were not re-laid-out and scroll inside the screen region.

Club crests come from the data provider's public imagery, and the trademark exposure is accepted by founder ruling (2026-09-27). The Premier League's own mark is not used; the competition is named in text only.

`/feed` redirects to Today. `/receipts` remains an unlisted compatibility route with no in-app entry. The Reporter RSS endpoint remains an acquisition surface.

The exact implemented state and known gaps live in [`product-state.json`](./product-state.json). In particular, the simplified settled-only `/receipts` experience is not yet complete and cannot be promised.

## AI Pundit contract

The Reporter tells you what matters. The Gaffer spots the choices. The Numbers Guy checks whether the score flatters anyone. The Romantic finds the magic. The Doomer finds the wobble. The Wind-Up finds the argument.

They share checked facts, not scripts. Each AI Pundit owns a separate:

- thesis and claim selection;
- humour system and language;
- complete script;
- performance plan and licensed synthetic voice;
- generated edition visual;
- prediction record where predictions are enabled.

Public material says **AI Pundit**. Internal `PunditId`, persona, and model terms remain where code or data compatibility needs them.

No output may imitate a living pundit's recognizable wording, style, or vocal identity.

## Generated visual identity

Each AI Pundit has an abstract motif. The current player combines the drop ID and AI Pundit ID to generate stable SVG geometry for that edition. A new edition can look different; the same edition does not flicker into a new identity on reload.

This is procedural generation in product code. It is not request-time image-model generation and must not be described as a photoreal person, digital human, or licensed likeness.

## Evidence contract

Full Time can support claims about:

- score progression and game state;
- goals, cards, substitutions, and recorded timing;
- shots, shots on target, xG, possession, corners, saves, and conversion;
- outcome versus underlying statistical performance;
- sufficiently sampled history;
- variance, probabilities, sample size, and counterfactual outcomes;
- registered expectations and settled results.

It cannot claim that structured data observed:

- pressing triggers or shapes, rest defence, overloads, spacing, or off-ball rotations;
- body shape, scanning, positioning, or an unrecorded player decision;
- coaching intent, confidence, effort, desire, leadership, or dressing-room dynamics;
- recruitment, finance, ownership, injury, or transfer context without a separate licensed source.

The simple public form is: **The data shows what happened, but not always why.**

## Proof cards

**Show me why** opens a sheet that shows one card at a time, up to three. Each card contains:

1. the claim in plain English;
2. up to three recorded facts or derivations supporting it;
3. a short boundary saying what the facts cannot prove.

Cards come only from a sealed evidence pack and licensed claim IDs selected by the published edition. The pack is chosen deterministically: the one the licensed claims name, else the latest sealed pack. The request does not ask a model to improvise an explanation. Missing support removes the card.

## Switching and fallback

The listener's current show is the safe state.

- While playing, a successful AI Pundit switch starts the requested edition from the beginning and keeps playing.
- While paused, a successful switch loads the requested edition at the beginning without autoplay.
- The saved preference changes only after the requested media loads.
- Failure leaves the previous edition playable and offers retry.
- Full Time never silently substitutes a different AI Pundit.
- Switching AI Pundit never changes the match. Stepping to another match is the same load-before-commit switch.
- Today opens on the newest Premier League match with a published show, or on a shared link's own match. It plays the requested AI Pundit's edition when they made one for that match, else the drop's canonical AI Pundit, else the first that did, and the rail names who made the show on screen (`src/lib/edition-pundit.ts`).

## Accountability

Accountability supports the show; it is not the front door and it is never a betting mechanic.

Predictions lock before kickoff when that system is enabled. Settlement uses the original test. Wrong calls remain part of the record. Primary public copy should say what the AI Pundit said, what happened, and what it missed. Internal metrics such as calibration, Brier score, and log loss belong behind optional detail and only after release evidence allows them to be public.

The current direct `/receipts` route still exposes the older searchable ledger. Today no longer carries the quiet entry: it was removed on 2026-09-27, and it had never rendered in production because the prediction ledger is empty and registration is disabled. `/receipts` has no in-app entry. Replacing the compatibility route remains product work.

## Beta and personalization

Full Time is for Premier League teams only, across the whole product (Ruling, Krish, 2026-09-27). One constant, `src/lib/premier-league.ts`, is read by the daily pick, the ingest, prediction sync, Teams, and Today. A day without a finished Premier League match publishes nothing and fails before any paid step. There are no other leagues on Teams and no coming-later league rows; that part of the 2026-08-11 decision is superseded ([`12-roadmap.md`](./12-roadmap.md)). Follows saved before the change, including other leagues' clubs, stay in storage and out of the count.

Saved team preferences exist. They do not yet create a private show or club-built playlist, and a follow does not change which match Today shows. Personalization may reorder approved content only when exact match metadata supports the relationship.

## Current posture

Full Time is a live beta by founder override since 2026-09-04. Flags still fail closed: a missing flag denies execution.

- All six AI Pundits are free and selectable without an account.
- Automated publication runs daily and publishes each AI Pundit edition that passes its checks; an edition that falls short is withheld.
- New checkout, paid promotion, prediction registration, and public forecast scores remain disabled.
- Existing subscribers can still manage billing.
- Archive and demo material stay labelled and never impersonate today's edition.
- A missing AI Pundit remains a visible failure.

See [`19-release-state.md`](./19-release-state.md) for live evidence and blockers.

## Non-goals

Full Time is not:

- a human podcast imitation;
- a live-score app, fixture database, or league-table product;
- a replacement for licensed match footage;
- a betting product;
- a forum or comments network;
- a tactics simulator that invents film evidence;
- a personal show generator in the current beta;
- a Big Five launch promise;
- an SEO content farm;
- launch-ready merely because the code builds.

## Launch standard

Launch requires one exact revision to pass:

- every hard gate, with no unsupported film or tactical claim;
- median 4/5 or higher on every required qualitative dimension;
- 80% blind AI Pundit identification and casual-fan comprehension;
- 70% preference over the current and generic baselines;
- zero incorrect audio numbers and 99% verified proper-name pronunciation;
- founder, fan, analyst, and audio-panel approval of full-length work;
- a forecast that beats the league base-rate baseline on held-out data;
- 60 approved matches, 360 passing scripts, and seven consecutive complete rehearsals;
- revision-bound rights, legal, privacy, accessibility, monitoring, rollback, feed, and operational sign-offs.

Thresholds do not relax to rescue a date. Safe but dull output stays private.

The founder override of 2026-09-04 launched the live beta before this standard was met. The standard is unchanged; the gates it names are recorded as waived and open in [`19-release-state.md`](./19-release-state.md), and the automated gates hold every published edition to the evidence, harness, and audio checks.
