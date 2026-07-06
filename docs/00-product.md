# 00 · Product

**Role:** Product manager / founder-mode AI agent.
**Read this when:** deciding what to build, prioritising, or saying no.
**Don't read this when:** debugging code (→ `02-developer.md`) or writing marketing copy (→ `07-marketing.md`).

---

## One-line

Full Time is the morning football recap, narrated, in 60-second cuts, for fans who don't have time to watch highlights.

## Why this exists

Match highlights are 3 to 8 minutes, video, and require attention. Most fans miss most matches outside the team they support. Existing audio products (talkSPORT, The Athletic) are either long-form or behind paywalls. Full Time fills the in-between: **one tap, one minute, every match that mattered**, while you make coffee.

## Target user

- Adult football fan in the UK/EU.
- Follows 1 to 3 clubs across the Big 5.
- Listens on a phone, often hands-busy (commuting, walking, cooking, training).
- Already uses Spotify or Apple Podcasts but won't subscribe to another podcast.
- Cares about *story*, not stats.

Not the target: hardcore stats fans, fantasy players, bettors.

## Promise

- Up by 07:00 local, every day there was football.
- 60 seconds per match. Confident, lean prose. Real scores, no rumours.
- Tap once, lock screen, walk away.
- Optional account. Optional push. The daily drop is free, always, no card.

## Anti-promise

- Not live. We are deliberately the *day-after* moment, not real-time.
- Not opinion. No takes, no rants, no transfer gossip.
- Not impressions. We don't fake Tyldesley or Drury.
- Not betting-adjacent. Ever.

## Accuracy is a feature, not a footnote

"Real scores, no rumours" is now true *by construction*, not by asking a model nicely. Every recap is written from a deterministic fact-pack (goals with running score, scorers per team, own-goals and penalties tagged, cards, full-match stats), then passed through a hard code gate (exact final score, scorers must be a subset of the fact-pack, length and phrasing rules) and a contradiction judge before it can publish. The engine is fail-closed: if it can't prove a recap is right, it ships nothing rather than something wrong. If we ever get a score wrong, that is a bug, not a limitation.

Mechanism lives in `02-developer.md`. What matters here: the promise is load-bearing and the product keeps it.

## Money

Free stays free. The daily drop, the whole morning of recaps with real audio, is free with no account required. That promise does not move.

**Full Time Pro, $4.99/mo USD.** One tier, optional, cancel anytime. It exists to fund the build (real Anthropic and ElevenLabs cost per drop) and to give committed fans control.

What Pro actually gates *today*:

- **Pundit selection.** Free listeners get one house voice, The Reporter (calm, straight, "zen"). The other five pundits (The Gaffer, The Stats Nerd, The Romantic, The Doomer, The Banter) are Pro. This is enforced for real, not just hidden in the UI: the server checks entitlement on `setVoiceStyle` and a database guard trigger backs it, so a free account cannot self-grant a Pro voice.

What Pro will unlock, marketed honestly as **"rolling out"** and *not yet built*:

- Your clubs first in the morning order.
- Every league in the drop.
- The full recap archive.

We say "rolling out" until each one ships. We never call an unbuilt thing done.

**Billing is on the Stripe test key, on purpose.** Checkout, the customer portal, and the webhook all work end to end, but no real card is charged yet. We flip to live keys when the near-term value is real enough to charge for. Until then Pro is honest about what it is: pick your pundit, back an independent build.

## Success metrics (v1)

Reality check: 0 real users, listens, or follows yet. Five hand-authored episodes are live. These are targets to steer by, not current numbers.

| Metric | Target by month 3 |
|---|---|
| DAU / MAU | ≥ 35% (sticky daily habit) |
| Median listens per active user per drop | ≥ 3 (out of ~6 to 8) |
| Push opt-in rate (of signed-in users) | ≥ 40% |
| Day-7 retention of new installs | ≥ 25% |
| Complaints about hallucination | < 0.5% of listens |

We do not measure: time-in-app (we want the opposite), screens-per-session, scroll depth.

## What we will say no to

- League standings / fixtures / stats pages.
- Comments, replies, "community".
- Live commentary.
- Long-form (5+ min) recaps.
- Native iOS/Android apps before PWA install rate is proven.
- Personalised AI voices "as you".
- Paywalling the daily drop itself. The free drop is a real product, not a demo.
- More than one paid tier. One Pro, $4.99, is the whole menu.
- NFTs, crypto, anything in that direction.

Add to this list when we kill an idea. See `12-roadmap.md` decision log.

## Voice & tone (product-level)

We are a **calm, confident match reporter**, not a hype machine. The product never shouts. The lime green of the brand does the shouting. Copy stays low-volume.

Detailed voice guide in `01-brand.md`.

## Distribution model

- PWA-first. Web push for the morning nudge.
- Shareable per-episode links (`/episode/{id}`, roadmap).
- Eventually: podcast RSS feed of the day's drop as a single 6-min episode.
