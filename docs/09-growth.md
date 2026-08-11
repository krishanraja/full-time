# 09 - Growth and measurement

- **Status:** Current
- **Owner:** Product and growth
- **Purpose:** Define the product metrics, event taxonomy, growth loops, and experiment rules.
- **Last reviewed:** 2026-08-10

## Measurement principle

Measure the listener behavior Full Time exists to create: choosing a mind, finishing the argument, returning the next morning, and checking the receipt.

Do not optimize opens, page views, or outrage in isolation.

## Metrics by stage

### Pre-launch quality

| Metric                                              | Release threshold or use          |
| --------------------------------------------------- | --------------------------------- |
| Hard-gate pass                                      | 100%                              |
| Median per qualitative dimension                    | At least 4/5, humour at least 3/5 |
| Blind persona identification                        | At least 80%                      |
| Preference over current and generic baselines       | At least 70%                      |
| Casual-fan main-claim comprehension                 | At least 80%                      |
| Audio authority, naturalness, timing, listenability | Mean at least 4/5                 |
| Proper-name pronunciation                           | At least 99% verified             |
| Complete rehearsals                                 | Seven consecutive on-time days    |

### Public product

Primary metric: **completed approved shows per weekly active listener**, segmented by pundit and coverage date.

Supporting metrics:

- day-7 and day-28 listener retention;
- completion rate and median listening time;
- pundit selection and switching rate;
- receipt return rate;
- share rate by portable line, prediction, and correction;
- push opt-in and delivery success;
- playback error rate;
- percentage of listeners who can identify their chosen persona.

Guardrails: factual incidents, quarantine rate, unsupported-claim escapes, audio failures, complaints, deletion requests, and accessibility defects.

## Implemented analytics events

All calls pass through `src/lib/analytics.ts`. The helper queues briefly while PostHog loads, no-ops on the server, stops after 30 seconds, and never breaks playback.

| Event               | Properties                           | Source                   | Decision it supports               |
| ------------------- | ------------------------------------ | ------------------------ | ---------------------------------- |
| `play_intent`       | `{ id }`                             | `player-store.ts`        | User tried to start an item        |
| `play_started`      | `{ id }`                             | real media `play` event  | Approved media actually began      |
| `listen_completed`  | `{ id }`                             | real media `ended` event | Item reached true completion       |
| `playback_error`    | `{ id, message }`                    | media failure            | Reliability and asset diagnosis    |
| `push_opt_in`       | none                                 | `push-client.ts`         | Notification conversion            |
| `follow`            | `{ entity_type, entity_id, action }` | `follow-store.ts`        | Follow/unfollow engagement         |
| `waitlist_join`     | `{ source }`                         | `waitlist.tsx`           | Launch-note source attribution     |
| `signin_gate_shown` | `{ surface }`                        | gated surfaces           | Auth friction                      |
| `name_a_game`       | `{ generated }`                      | `archive.tsx`            | Legacy archive demand and failures |

`listen_completed` comes only from the audio element. Missing media cannot generate completion.

## Event rules

- Add an event only when it changes a decision.
- Use stable snake-case names and documented properties.
- Do not send script text, questions, emails, tokens, provider errors containing secrets, or sensitive profile data.
- Distinguish intent, start, completion, and failure.
- Record pundit, surface, and coverage date when the product contract needs attribution.
- Update this table in the same change as event code.

## Growth loops

### Prediction to receipt

Publish a falsifiable claim before kickoff, then send users back to a plain settlement. This loop compounds authority because wrong calls remain visible.

### Portable insight

Turn one approved concept or line into a share card linked to its evidence and full edition. The share should teach something even if the recipient never installs the app.

### Pundit comparison

Let users compare two editions grounded in the same match. The useful social question is which interpretation was stronger, not which synthetic voice was louder.

### Morning habit

Once daily reliability is proven, use opt-in push at the listener's relevant morning. Never trigger the browser permission prompt on first contact.

### Reporter feed to web

Podcast directories carry the Reporter. The close and description route listeners to the web for other minds, receipts, and comparison.

## Experiment policy

1. State the decision the experiment will inform.
2. Pre-register primary metric, guardrails, audience, duration, and stopping rule.
3. Change one material variable at a time.
4. Require at least seven days and a sample sized for the expected effect; do not treat `1,000 users` as universally sufficient.
5. Segment by new/returning listener, pundit, source, device, and coverage quality where relevant.
6. Record negative and inconclusive results.
7. Stop an experiment immediately if factual, safety, accessibility, privacy, or billing guardrails fail.

Never test removal of AI disclosure, weaker evidence gates, hidden wrong receipts, unsupported urgency, dark-pattern consent, or payment before legal approval.
