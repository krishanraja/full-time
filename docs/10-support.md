# 10 - Support

- **Status:** Current
- **Owner:** Support and product
- **Purpose:** Provide plain, accurate user answers, first-line diagnosis, and escalation paths.
- **Last reviewed:** 2026-08-11

## Tone

Be warm, brief, and specific. Use words a ten-year-old can understand. Say **AI Pundit** everywhere. Do not defend a bad output, hide behind pre-launch, or explain internal machinery before answering the question.

Sign as **Full Time**. Do not promise a launch date, fix time, coverage expansion, refund, deletion completion, paid plan, or daily show without the owner and evidence needed to deliver it.

## Canonical answers

### What is Full Time?

Full Time takes one set of checked football facts and gives it to six AI Pundits. Each one makes a complete show with a different brain, humour, and argument.

### Did AI make this?

Yes. AI writes each show from checked structured match data, and the voice is synthetic. Full Time does not use broadcast audio or copy a living pundit. Important claims may include a **Show me why** card with the match fact underneath and a note about what the data cannot prove.

### Where is today's show?

Today shows a checked edition for the selected AI Pundit. If today's edition is unavailable, it may offer that same AI Pundit's latest checked show with the real date. If neither exists, the screen says nothing is ready. It never relabels an old show as today.

### Why did I get an older show?

Today's edition for that AI Pundit did not clear every check. Full Time kept the latest approved one and showed its real date instead.

### Can I choose another AI Pundit?

Yes. All six are free. Open the AI Pundit picker on Today. If the new edition loads, it starts from the beginning. If it fails, your old show stays ready and you can retry.

### Why did the show start again after I switched?

Each AI Pundit makes a complete edition, not a different voice over the same track. Switching starts the new edition from the beginning.

### Why does each AI Pundit look different today?

Each edition gets a fresh abstract avatar made from the show and AI Pundit IDs. It stays the same for that edition and changes with a new one. It is not a real person or a copied likeness.

### What does Show me why do?

It shows the claim, the checked match fact behind it, and what that fact cannot prove. Those cards come from sealed match evidence and approved claims, not a new AI answer made when you tap.

### Why does the AI Pundit say the data cannot answer something?

That is deliberate. Match data can show recorded events and numbers. It cannot always show intent, positioning, confidence, effort, or what happened in the dressing room.

### What is How did they do?

It is a check on a settled AI Pundit call: what they said, what happened, and what they missed. Today shows the link only when settled records exist. The direct track-record page still uses an older prediction-ledger layout during pre-launch.

### Is this for betting?

No. Full Time is football commentary, not betting advice. Public forecast scores remain hidden until the approved testing gate passes.

### Which leagues are available?

The intended beta is Premier League first, with other leagues later. The Teams screen has not yet finished that restriction, so confirm the exact live data before telling a user that a league is supported.

### What does following a team change?

The app saves the preference. It does not yet build a private personal show or club playlist. Do not promise that a followed club will appear unless exact match metadata and approved content support it.

### Is Full Time free?

All six AI Pundits are free during pre-launch. New subscriptions are paused and no card is needed.

### I already subscribed. How do I cancel?

Existing subscribers can open Settings and use the billing-management link. Never ask for card details.

### Why will the audio not play?

Full Time uses real audio only. Retry once. If it still fails, send the page URL, selected AI Pundit, device, browser, exact message, and time.

### Can I install it?

Yes, as a web app. On iPhone or iPad, use Share then Add to Home Screen. On supported Android browsers, use Install app from the browser menu.

### Why are notifications unavailable?

Morning notifications are paused during private verification. They stay off until the daily system proves reliable.

### I want my account or data deleted.

Record the authenticated email and send the request to the privacy owner. Never ask for a password or token. Confirm receipt, not completion time.

## First-line diagnosis

| Report                          | Check first                                          | Escalate with                                   |
| ------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Blank or broken page            | URL, device, browser, hard refresh, screenshot       | Timestamp and console or request ID             |
| Audio unavailable               | Edition, audio URL, network, browser policy          | Variant ID, AI Pundit, page, exact message      |
| Wrong fact                      | Match, exact sentence, proof card, transcript        | Evidence pack and variant ID                    |
| Unsupported why claim           | Claim, proof boundary, available evidence            | Claim ID, evidence refs, variant ID             |
| Wrong pronunciation             | Name, timestamp, expected pronunciation              | Variant ID and lexicon entry                    |
| Wrong AI Pundit played          | Selected choice, displayed label, shared query       | Saved state, URL, variant ID                    |
| Failed AI Pundit switch         | Playing or paused, requested AI Pundit, retry result | Old and requested variant IDs, media error      |
| Stale show labelled current     | Coverage date, fallback label, local timezone        | Screenshot and URL                              |
| Team or league promise mismatch | Exact response and saved follows                     | Team or league IDs and route output             |
| Settled-record dispute          | Original rule and recorded outcome                   | Prediction ID and cited data                    |
| Billing issue                   | Existing subscriber or blocked new checkout          | User ID and Stripe customer ID, never card data |

## Severity

- **P0:** data exposure, unauthorized charge, widespread outage, or harmful content actively publishing. Pause the affected system and alert founder, engineering, legal, and operations.
- **P1:** wrong fact, wrong voice, public unsupported claim, broken current edition, incorrect fallback, or settled-record integrity failure. Quarantine and respond the same day.
- **P2:** isolated playback, switching, auth, preference, generated avatar, pronunciation, or accessibility defect. Reproduce with evidence.
- **P3:** feature, team, league, copy, or AI Pundit feedback. Record for product review.

## Escalation

- Editorial, factual, proof, humour, or imitation issue: [`05-content-safety.md`](./05-content-safety.md)
- Playback, schedule, deployment, or publication: [`06-ops.md`](./06-ops.md)
- Privacy, deletion, takedown, or billing law: [`11-legal.md`](./11-legal.md)
- Partnership or press: [`08-sales.md`](./08-sales.md)
- Marketing claim: [`07-marketing.md`](./07-marketing.md) and [`21-go-to-market-agent.md`](./21-go-to-market-agent.md)
- Product request or known gap: [`12-roadmap.md`](./12-roadmap.md)

Preserve the user's words, IDs, time, surface, and exact product state. Never paste secrets or raw provider payloads into a ticket.
