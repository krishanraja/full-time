# 07 · Marketing

**Role:** Marketing, content, social, launch agent.
**Read this when:** writing channel copy, planning a launch, briefing a designer, picking partners.
**Don't read this when:** you need product strategy (→ `00-product.md`) or growth experiments (→ `09-growth.md`).

---

## Positioning

> **The morning football briefing. Narrated. 60 seconds per match.**

We are the *day-after* moment, not the *during-match* moment. We do not compete with Sky, BBC, TNT, talkSPORT. We compete with: scrolling Twitter half-asleep, the "highlights" tab on YouTube, missing the result entirely.

### Three things to never lead with

- "AI" as the headline. AI is the *how*, not the *why*. Lead with the user benefit (the morning, 60 seconds, every match).
- "Podcast." We're shorter and tighter than a podcast — calling it a podcast under-sells the format.
- "Free." Coming at the wallet first signals low value.

## Audience segments

| Segment | Hook |
|---|---|
| Time-poor super-fan | "Every match that mattered, in the time it takes to brew coffee." |
| Lapsed fan | "Get back into football without watching highlights." |
| Multi-league fan | "Big Five, every morning. One app." |
| Commuter | "Lock screen, walk. We'll do the talking." |

## Channels (priority order)

1. **Word of mouth + Reddit.** r/soccer, r/PremierLeague, r/LaLiga, r/seriea, r/Bundesliga, r/Ligue1. Show up as a fan, share the product when relevant. Never spam.
2. **Twitter/X.** Daily "today's drop is live" tweet with the headline match scoreline + a 15-second teaser clip.
3. **TikTok / Reels.** Daily 30-sec auto-clip of the biggest moment recap. Vertical video, animated waveform, brand mark in the corner.
4. **Football podcast cross-promo.** Mid-tier shows (10–50k listeners) will swap shout-outs if our product is genuinely good.
5. **SEO-light.** Per-match share pages (roadmap) → "{Home} vs {Away} recap — Full Time".

## Launch checklist

- [ ] Landing page (or `/` itself) shows the product working — not a sign-up form.
- [ ] OG / Twitter card image set (see `01-brand.md` notes).
- [ ] PWA install prompt fires after second visit.
- [ ] Plausible domain wired, key events firing.
- [ ] `/legal/privacy` and `/legal/terms` reachable.
- [ ] First seven days' content is *certain*. No launch on a Tuesday with no Monday matches.
- [ ] Three "anchor" reviewers / podcasters teed up with early access (1 week before).
- [ ] Reddit posts drafted but not posted from a new account — use an existing fan account or post as the product transparently.

## Copy bank

### App store / social one-liners
- "Yesterday's biggest stories from the Big Five. Narrated. 60 seconds per match."
- "Coffee in one hand. Football recap in the other ear."
- "The morning drop. Up by 7am. Listen and go."
- "Every match that mattered. In sixty seconds."

### Push copy (the morning nudge)
- "Today's recaps are live. 4 minutes total."
- "Eight matches. Six minutes. We narrated them. Tap in."
- "The Premier League weekend, in your ear."

Keep push under 80 chars. No emoji. No exclamation marks.

### Anti-copy (do not ship)
- ❌ "🔥 Don't miss out! 🔥"
- ❌ "AI-powered next-gen football experience"
- ❌ "Your personal football assistant"
- ❌ "Game-changing way to enjoy football"

## SEO

- Site title: `Full Time — Daily football recaps, narrated` (handled in `__root.tsx`).
- Per-route title pattern: `{Section} • Full Time`.
- We are *not* an SEO product at v1. No content-farm pages. The play here is direct + social.

## Brand stewardship

When in doubt, defer to `01-brand.md`. The brand is what makes us not generic AI slop.
