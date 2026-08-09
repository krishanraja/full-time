# 09 · Growth

> **CURRENT-SYSTEM PRECEDENCE (2026-08-08):** The core format is now one 5-8 minute daily show with six selectable variants, not 60-second match cuts. Growth experiments must preserve evidence, receipts and saved-pundit attribution.

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

## PostHog event taxonomy

We use **fewer events on purpose**. Add an event only if it changes a decision.

Status column is the honest one: **live** means the call exists in the code and fires in production.

| Event | Properties (as actually sent) | Fired by | Status |
|---|---|---|---|
| `play` | `{ id }` | `player-store.ts` on play | live |
| `complete` | `{ id }` | `player-store.ts` on ended | live |
| `push_opt_in` | none | `push-client.ts` after the subscription saves | live |
| `waitlist_join` | `{ source: "waitlist_page"\|"settings"\|"today"\|"auth_redirect" }` | `waitlist.tsx` on confirmed join | live |
| `signin_gate_shown` | `{ surface }` | `archive.tsx` locked view, `settings.tsx` pundit gate | live |
| `name_a_game` | `{ generated: "true"\|"false" }` | `archive.tsx` on-demand narration | live |
| `follow` | `{ entity_type: "team"\|"league", entity_id, action: "follow"\|"unfollow" }` | `follow-store.ts` in `useToggleFollow`, the chokepoint behind every `FollowButton` | live from 2026-08-05 |
| `install_prompt_shown` / `install_prompt_accepted` | none | install prompt component | not built (roadmap) |
| `share` | `{ episode_id, channel }` | per-episode share | not built (roadmap) |

Unfollow is not its own event. It is `follow` with `action: "unfollow"`, for the same reason `name_a_game` carries `generated` instead of splitting in two: the taxonomy is deliberately small, both directions come out of one `useToggleFollow` call, and PostHog breaks down by property as easily as by event name. Keeping them together also means the net follow count for a user is one series filtered two ways rather than two series that can drift apart. Filter to `action = "follow"` for gross adds; leave the filter off for total follow-button engagement.

One caveat on reading `follow`: it records the tap, not the persisted row. Signed-out users are counted (their follows live in `localStorage` only, never in the `follows` table), and a signed-in tap whose server write fails still leaves an event behind after the UI rolls back. Treat it as an engagement signal, and count rows in `follows` when you need the durable number.

One known gap remains to close when someone touches this next: `play` does not carry the `source` the surface came from.

We do **not** track: scrolls, hovers, page-views beyond PostHog's automatic ones.

Implementation: import `track` from `src/lib/analytics.ts` and call `track(eventName, { ... })`. Never call the vendor global directly. The helper is the single place that knows the vendor, no-ops on the server, no-ops when the script has not loaded or is ad-blocked, and never throws.

PostHog loads unconditionally from `routes/__root.tsx`, no env var gates it. Plausible was removed on 2026-08-05: it was only ever loaded when `VITE_PLAUSIBLE_DOMAIN` was set, that variable was never set in any environment, and every event above silently no-opped from the day it was written until this change.

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
