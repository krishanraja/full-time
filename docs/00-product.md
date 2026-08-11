# 00 - Product doctrine

- **Status:** Current
- **Owner:** Founder and product
- **Purpose:** Define the product, its user promise, evidence boundary, and launch standard.
- **Last reviewed:** 2026-08-11

## Product in one sentence

Full Time turns one set of checked football facts into six complete shows, each made and performed by a different **AI Pundit**.

> One real match. Six AI Pundits. Pick the brain you fancy.

The product should feel great because it is AI. It does not try to hide the machine or recreate a human studio. AI makes six full, genuinely different readings of one match practical. Deterministic evidence controls keep the shared facts real and show where those facts stop.

## The first experience

A listener should be able to:

1. open Today without an account or autoplay;
2. see a playable show in the first mobile viewport;
3. understand the title and hook without specialist football language;
4. choose one of six AI Pundits from a simple bottom drawer;
5. switch safely without losing the playable show when the new edition fails;
6. tap **Show me why** for plain proof behind an important claim;
7. hear more approved editions below the player;
8. see **How did they do?** only when a settled record exists.

The interface should feel playful, warm, and obvious to a ten-year-old. Technical rigor belongs underneath the experience, not in the primary vocabulary.

## Current product shape

The public shell has three destinations:

- **Today:** the AI Pundit player, proof, recent approved shows, and conditional track-record entry;
- **Teams:** the compatibility route at `/following` for saved team and league preferences;
- **Settings:** account, AI Pundit choice, product state, notification state, disclosure, and existing billing management.

`/feed` redirects to Today. `/receipts` remains an unlisted compatibility route. The Reporter RSS endpoint remains an acquisition surface.

The exact implemented state and known gaps live in [`product-state.json`](./product-state.json). In particular, Premier-League-only Teams behavior and the simplified settled-only `/receipts` experience are not yet complete and cannot be promised.

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

**Show me why** may reveal one to three cards. Each card contains:

1. the claim in plain English;
2. up to three recorded facts or derivations supporting it;
3. a short boundary saying what the facts cannot prove.

Cards come only from a sealed evidence pack and licensed claim IDs selected by the published edition. The request does not ask a model to improvise an explanation. Missing support removes the card.

## Switching and fallback

The listener's current show is the safe state.

- While playing, a successful AI Pundit switch starts the requested edition from the beginning and keeps playing.
- While paused, a successful switch loads the requested edition at the beginning without autoplay.
- The saved preference changes only after the requested media loads.
- Failure leaves the previous edition playable and offers retry.
- Full Time never substitutes a different AI Pundit.
- When today has no edition for that AI Pundit, Full Time may offer the latest approved edition for the same AI Pundit with its real date.

## Accountability

Accountability supports the show; it is not the front door and it is never a betting mechanic.

Predictions lock before kickoff when that system is enabled. Settlement uses the original test. Wrong calls remain part of the record. Primary public copy should say what the AI Pundit said, what happened, and what it missed. Internal metrics such as calibration, Brier score, and log loss belong behind optional detail and only after release evidence allows them to be public.

The current direct `/receipts` route still exposes the older searchable ledger. Today uses the settled-only endpoint for its quiet entry. Replacing the compatibility route remains product work.

## Beta and personalization

The intended beta competition is the Premier League. Other major leagues should remain visible as coming later. That restriction has not yet shipped in the Teams data response, so marketing and support must describe exact live coverage only after readback.

Saved team preferences exist. They do not yet create a private show or club-built playlist. Personalization may reorder approved content only when exact match metadata supports the relationship.

## Current posture

Full Time is in fail-closed pre-launch with no promised public date.

- All six AI Pundits are free and selectable without an account.
- Automated public publication, new checkout, paid promotion, and public forecast scores remain disabled.
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
