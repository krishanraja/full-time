# 00 · Product

**Role:** Product manager / founder-mode AI agent.
**Read this when:** deciding what to build, prioritising, or saying no.
**Don't read this when:** debugging code (→ `02-developer.md`) or writing marketing copy (→ `07-marketing.md`).

---

## One-line

Full Time is the morning football recap, narrated, in 60-second cuts — for fans who don't have time to watch highlights.

## Why this exists

Match highlights are 3–8 minutes, video, and require attention. Most fans miss most matches outside the team they support. Existing audio products (talkSPORT, The Athletic) are either long-form or behind paywalls. Full Time fills the in-between: **one tap, one minute, every match that mattered**, while you make coffee.

## Target user

- Adult football fan in the UK/EU.
- Follows 1–3 clubs across the Big 5.
- Listens on a phone, often hands-busy (commuting, walking, cooking, training).
- Already uses Spotify or Apple Podcasts but won't subscribe to another podcast.
- Cares about *story*, not stats.

Not the target: hardcore stats fans, fantasy players, bettors.

## Promise

- Up by 07:00 local, every day there was football.
- 60 seconds per match. Confident, lean prose. Real scores, no rumours.
- Tap once, lock screen, walk away.
- Optional account. Optional push. Free.

## Anti-promise

- Not live. We are deliberately the *day-after* moment, not real-time.
- Not opinion. No takes, no rants, no transfer gossip.
- Not impressions. We don't fake Tyldesley or Drury.
- Not betting-adjacent. Ever.

## Success metrics (v1)

| Metric | Target by month 3 |
|---|---|
| DAU / MAU | ≥ 35% (sticky daily habit) |
| Median listens per active user per drop | ≥ 3 (out of ~6–8) |
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
- NFTs, crypto, anything in that direction.

Add to this list when we kill an idea. See `12-roadmap.md` decision log.

## Voice & tone (product-level)

We are a **calm, confident match reporter**, not a hype machine. The product never shouts. The lime green of the brand does the shouting — copy stays low-volume.

Detailed voice guide in `01-brand.md`.

## Distribution model

- PWA-first. Web push for the morning nudge.
- Shareable per-episode links (`/episode/{id}` — roadmap).
- Eventually: podcast RSS feed of the day's drop as a single 6-min episode.
