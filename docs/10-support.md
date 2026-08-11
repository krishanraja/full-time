# 10 - Support

- **Status:** Current
- **Owner:** Support and product
- **Purpose:** Provide approved user answers, first-line diagnosis, and escalation paths.
- **Last reviewed:** 2026-08-10

## Tone

Be calm, brief, and specific. Acknowledge the user's experience before explaining the system. Never blame the model, argue that a wrong output was "technically" correct, or hide behind pre-launch status.

Sign as **Full Time**. Do not promise a launch date, refund, fix time, coverage expansion, or data deletion completion without the owner who can deliver it.

## Canonical answers

### Where is today's show?

Full Time is still in private verification. The home screen shows a genuinely current, fully approved drop or says that none has cleared the gates. It never substitutes archive material and calls it today.

### Why is a match missing?

The match may be outside the current structured-data coverage, incomplete at ingest, or quarantined because one of the six editions or assets failed. Tell us the teams and date so we can identify which case applies.

### Did AI make this?

Yes. Full Time generates scripts from structured match data, runs deterministic and model-based quality checks, then uses synthetic voices. It does not use broadcast audio or imitate a living pundit. The transcript, evidence boundary, and prediction receipts remain visible.

### Can I choose another pundit?

Yes. All six are free and selectable without an account. Each has a separate thesis, script, humour system, performance plan, and prediction record. Your local choice is not overwritten by a shared link.

### Why does a pundit say the data cannot answer something?

That is deliberate. Structured data can show recorded events and statistics, but it cannot always show tactical intent, positioning, confidence, or dressing-room context. Full Time would rather name that limit than invent an explanation.

### What is a receipt?

A receipt is the settlement of a prediction registered before kickoff. It shows the original claim, test, outcome, and what the pundit got right, wrong, or could not judge.

### Is Full Time free?

The preview and all six pundits are free. New checkout and paid promotion are disabled. No card is required.

### I already subscribed. How do I cancel?

New subscriptions are disabled, but existing subscribers can still open the secure billing portal from Settings to manage or cancel.

### Can I share an edition?

Approved drops and receipts can be shared with a selected-pundit preview. The link does not change the recipient's saved pundit without confirmation.

### Why will the audio not play?

Full Time uses real audio only. If an approved file is missing, blocked, or unavailable, the player shows an error instead of simulating playback. Retry once, then send us the page URL, device, browser, and time.

### Can I install it?

Yes, as a progressive web app. On iOS, use Share then Add to Home Screen. On supported Android browsers, use Install app from the browser menu.

### Why are notifications unavailable?

Morning notifications remain paused during private verification. They will stay disabled until the daily publication system proves reliable.

### Can you add my league?

Tell us the competition. Expansion depends on licensed data, evidence quality, evaluation coverage, and operational capacity, not request volume alone.

### I want my account or data deleted.

Record the authenticated email and forward the request to the privacy owner. Do not ask for passwords or tokens. Confirm receipt promptly; the legal runbook owns identity verification and completion timing.

## First-line diagnosis

| Report                         | Check first                                                    | Escalate with                                   |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------- |
| Blank or broken page           | URL, device, browser, hard refresh, screenshot                 | Timestamp and console/request ID if available   |
| Audio unavailable              | Current approved variant, audio URL, network, browser autoplay | Variant ID, pundit, page, exact message         |
| Wrong fact                     | Match, exact sentence, transcript and receipt link             | Evidence pack and variant ID                    |
| Wrong pronunciation            | Entity, time in audio, expected pronunciation                  | Variant ID and lexicon entry                    |
| Wrong pundit played            | Selected preference, shared-link preview, displayed label      | User state, link, variant ID                    |
| Stale content labelled current | Coverage date and page                                         | Screenshot, URL, local time zone                |
| Prediction settlement disputed | Original rule and settlement evidence                          | Prediction ID and cited data                    |
| Sign-in link missing           | Spam, email typo, wait five minutes                            | Email domain, timestamp, provider logs          |
| Billing issue                  | Existing subscriber or new checkout attempt                    | User ID and Stripe customer ID, never card data |

## Severity

- **P0:** data exposure, unauthorized charge, widespread outage, or harmful content actively publishing. Pause affected systems and alert founder, engineering, legal, and operations immediately.
- **P1:** wrong fact, wrong voice, public unsupported claim, broken current drop, or receipt integrity failure. Quarantine and respond the same day.
- **P2:** isolated playback, auth, preference, pronunciation, or accessibility defect. Triage with reproduction evidence.
- **P3:** feature request, coverage request, or copy feedback. Record for product review.

## Escalation

- Editorial, factual, humour, or imitation issue: [`05-content-safety.md`](./05-content-safety.md).
- Outage, audio, schedule, or deployment: [`06-ops.md`](./06-ops.md).
- Privacy, takedown, deletion, or billing law: [`11-legal.md`](./11-legal.md).
- Partnership or press: [`08-sales.md`](./08-sales.md).
- Product request or doctrine question: [`12-roadmap.md`](./12-roadmap.md).

Preserve the user's words, relevant IDs, timestamp, surface, and exact product state. Never paste secrets or full provider payloads into a ticket.
