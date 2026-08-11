# 00 - Product doctrine

- **Status:** Current
- **Owner:** Founder and product
- **Purpose:** Define the product, its editorial contract, and the standard for launch.
- **Last reviewed:** 2026-08-10

## Product in one sentence

Full Time is an autonomous, interactive football morning show with six genuinely different AI pundits, evidence for every opinion, and a public receipt for every registered prediction.

> One football morning. Six genuinely different minds. Every opinion has evidence. Every prediction gets a receipt.

## Current posture

Full Time is in fail-closed pre-launch with no promised public date.

- All six pundits are free and selectable without an account.
- New checkout, Pro promotion, automated public publication, and public forecast scores are disabled.
- Existing subscribers can still reach billing management.
- Archive and demo content must remain labelled; it cannot impersonate today's drop.
- A missing or quarantined persona remains visible as a failure. Another persona never replaces it silently.
- The web app is the product. One canonical Reporter RSS feed is an acquisition channel.

The current production state and exact blockers live in [`19-release-state.md`](./19-release-state.md).

## User promise

A listener should be able to:

1. open Full Time without creating an account;
2. choose a pundit whose mind, humour, and delivery are recognizably different;
3. understand one original claim after one listen;
4. see which facts support that claim and where the evidence stops;
5. return later to see whether a prediction was right, wrong, or unjudgeable;
6. hear an explicit change of mind when the registered test fails.

## Editorial doctrine

The target blend is:

- 40% tactical and structural analysis, limited to what licensed evidence proves;
- 20% probability and decision-quality analysis;
- 15% football context and journalism;
- 15% storytelling and broadcasting;
- 10% provocation.

Humour, clarity, originality, memorable language, and restraint apply across the whole mix. They are not an extra layer added after the analysis.

Every successful segment contains:

1. an observation;
2. the recorded mechanism or decision that produced it;
3. a clear judgment;
4. the strongest available evidence;
5. a material counterpoint or uncertainty;
6. one portable line or concept;
7. a prediction, receipt, implication, or explicit reason to stop analysing.

> Full Time makes bold, evidence-grounded judgments. Facts are closed-world and verified. Interpretations may differ by pundit. Predictions are timestamped. Mistakes are acknowledged plainly.

## Evidence boundary

The structured-data tier can support claims about:

- score progression and game state;
- goals, cards, substitutions, timing, and recorded substitution impact;
- shots, shots on target, xG, possession, corners, saves, and conversion;
- outcome versus underlying statistical performance;
- sufficiently sampled home, away, and head-to-head history;
- variance, probabilities, sample size, and counterfactual outcomes;
- registered expectations and whether they occurred.

It cannot support claims that Full Time observed:

- pressing triggers, pressing shapes, rest defence, overloads, spacing, or off-ball rotations;
- body shape, scanning, positioning, or an unrecorded player decision;
- coaching intent, dressing-room dynamics, confidence, leadership, desire, or effort;
- recruitment, PSR, ownership, injury, or transfer context without a separately licensed source.

The right answer is sometimes: "The data shows what happened, but not why."

## Pundit contract

The Reporter prioritizes significance. The Gaffer judges decisions in context. The Numbers Guy separates process from outcome. The Romantic lets exceptional moments breathe. The Doomer makes downside paths testable. The Wind-Up punctures contradictions, then returns to evidence.

They share facts, not scripts. Each pundit owns a separate thesis, humour system, performance plan, prediction record, and standard for changing its mind.

Humour may target decisions, contradictions, institutions, club PR, match situations, statistical absurdity, and football culture. It never targets injuries, grief, protected traits, private lives, mental health, or personal humiliation.

No output may imitate a living pundit's recognizable wording, style, or vocal identity.

## Prediction accountability

Predictions lock before kickoff. Every public prediction includes its evidence, falsifier, and settlement rule. A pundit may move the shared calibrated probability by at most five percentage points unless an additional licensed evidence item supports the difference.

Settlement uses the original rule. Forecasts receive Brier score and log loss. Qualitative theses settle as `correct`, `partly_correct`, `wrong`, or `unjudgeable`. A wrong thesis produces a receipt that states what the pundit believed, what happened, and what it missed or overweighted.

## Non-goals

Full Time is not:

- a live-score app, fixture database, or league table product;
- a replacement for licensed match footage;
- a forum or comments network;
- a betting product;
- an imitation engine for human broadcasters;
- a tactics simulator that invents film evidence;
- an SEO content farm;
- launch-ready merely because the code builds.

## Launch standard

Launch requires all of the following against one exact revision:

- 100% hard-gate pass and no unsupported film or tactical claims;
- median 4/5 or higher on every required qualitative dimension;
- 80% blind persona identification and 80% casual-fan comprehension;
- 70% preference over both the current baseline and an unconditioned model;
- zero incorrect audio numbers and 99% verified proper-name pronunciation;
- full-length founder, fan, analyst, and audio-panel approval;
- a forecast that beats the league-base-rate baseline on held-out data;
- 60 approved matches, 360 passing scripts, and seven consecutive complete rehearsals;
- revision-bound legal, privacy, accessibility, monitoring, rollback, feed, and operational sign-offs.

Thresholds never relax to rescue a schedule. Safe but forgettable content stays quarantined.
