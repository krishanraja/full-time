# 09 · Growth

**Role:** Growth experiments, retention, acquisition loops.
**Read this when:** designing an experiment, picking a metric, instrumenting an event.
**Don't read this when:** doing broad marketing (→ `07-marketing.md`).

---

## North-star metric

**Daily completed listens per active user** during the 07:00 to 10:00 window.

Not DAU, not opens, not installs. Completed = listened past 90% of the recap (`listens.completed = true`). The product wins when users tap play 3 to 5 times in their morning and walk away, the metric should reflect that exact shape.

## Supporting metrics

| Metric | Why |
|---|---|
| Day-7 retention of new installs | Habit-forming proxy |
| Push opt-in % (of signed-in users) | The loop's most fragile step |
| Follows-set after first session | Personalisation = stickier morning |
| Share rate (taps on share, future) | Organic acquisition signal |

## Plausible event taxonomy

We use **fewer events on purpose**. Add an event only if it changes a decision.

| Event | Properties | Fired by |
|---|---|---|
| `play` | `{ episode_id, source: "hero"\|"card"\|"list"\|"mini" }` | `player-store.ts` on first play |
| `complete` | `{ episode_id }` | `player-store.ts` past 90% |
| `follow` | `{ entity_type, entity_id }` | `FollowButton.tsx` |
| `push_opt_in` | `{}` | `settings.tsx` push toggle |
| `install_prompt_shown` / `install_prompt_accepted` | `{}` | install prompt component (roadmap) |
| `share` | `{ episode_id, channel }` | per-episode share (roadmap) |

We do **not** track: scrolls, hovers, page-views beyond Plausible's automatic ones.

Implementation: `window.plausible?.(eventName, { props: { ... } })`. Plausible only loads when `VITE_PLAUSIBLE_DOMAIN` is set.

## Acquisition loops (priority)

### 1. Per-episode share link (roadmap, biggest unlock)
`/episode/{id}`, page that auto-plays the recap, has a custom OG image with the scoreline, and a strong "get tomorrow's at 7am" CTA. The viral loop is *not* the app, it's the share of a specific match someone wants their friend to hear about.

### 2. PWA install prompt
After the user's second visit and second completed listen, surface an install card. Don't ask earlier; the user hasn't decided yet.

### 3. Push as a re-engagement loop
A signed-in user who never enables push will churn. Surface the opt-in prompt:
- On the second morning they visit
- After they hit follow on a team
- On Settings as a card, not buried

Never auto-trigger the browser prompt, that's an instant block. Use a custom card → then trigger.

### 4. Referral (later)
"Send a friend tomorrow's drop." Generates a unique link that pre-follows the sender's teams. Easy to build once accounts are sticky.

## Retention levers

| Lever | Owner |
|---|---|
| Morning push reliability (must hit ≥99% of subs) | Ops (`06-ops.md`) |
| Recap quality (no hallucinations, no awkward TTS) | Pipeline (`05-content-safety.md`) |
| Personalised lead (their team first) | Feed function (`src/lib/api/feed.functions.ts`) |
| Speed (TTFB < 800ms on mobile 4G) | Frontend (`02-developer.md`) |

A drop in completed-listens almost always traces to one of these four. Diagnose in order.

## Experiment policy

- One change at a time.
- Minimum sample: 1,000 unique users or 7 days, whichever longer.
- Pre-register what would make the change permanent.
- Negative results count. Log all experiments in `12-roadmap.md` decision log.

## Things we will not A/B test

- AI disclosure copy / removal of disclosure.
- The brand colour, mark, or wordmark.
- The 60-second target length (changing this is a product decision, not a test).
- Whether to add a paywall.
