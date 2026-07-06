# 10 · Support

**Role:** User-facing support agent, or anyone answering a help request.
**Read this when:** a user asks a question, reports a bug, or asks to delete their data.
**Don't read this when:** the issue is an outage, that's ops (`06-ops.md`).

---

## Tone

Calm, brief, fan-to-fan. Sign off as "Full Time" not a person. No emoji. Reply in <24h.

If a user is angry about a wrong recap or a missing match, **acknowledge first, fix second, explain third**. Never argue the model was technically right.

## Canonical FAQ

> Authoritative copy. If the FAQ on the site ever drifts from this, update the site to match.

### "Where are today's recaps?"
Drops at ~07:00 local. If it's after 08:00 and nothing's there, check `/feed` directly. If still empty, please reply, that's an outage, not a content gap.

### "Why is my team's match missing?"
We cover the Big Five (Premier League, La Liga, Serie A, Bundesliga, Ligue 1). Cup matches and lower divisions aren't in v1. If you'd like to see them, reply and tell us which league, we track requests.

### "The recap got a fact wrong."
Apologies, please tell us the match and the line that was wrong. We'll take the recap down, fix the prompt, and credit it in our changelog if it's a pattern.

### "How is this made?"
Recaps are written by an AI model (Anthropic's Claude) from publicly available match data (final scores, scorers, minutes, stats), then checked by an automated accuracy pass that blocks the recap if it gets the winner, the score, or a scorer wrong. The voice is synthetic (ElevenLabs). We never use copyrighted broadcast audio. Full disclosure on Settings.

### "Can I pick a different voice?"
In Settings → Your pundit. Everyone gets The Reporter and The Gaffer, no account needed (your pick stays on that device). A free account unlocks all six pundits (adding The Numbers Guy, The Romantic, The Doomer, The Wind-Up) and syncs your choice across devices. Distinct per-pundit narration is rolling out.

### "What is the archive / name a game?"
Signed-in (free), the Archive tab lists every match we hold data for. Anything already narrated plays instantly. Anything with minute-by-minute data can be narrated on the spot: the engine writes it, checks it against the match facts, and only publishes if it can prove it right. That check is why it can refuse ("we could not verify this recap"), and a refusal does not count against your day. Limit: 3 narrations per day, resets midnight UTC.

### "What is the waitlist?"
The full app: every matchday narrated and live by 7am local, with the morning push. It switches on when the waitlist proves demand, and we admit the list in join order. Joining is free; the sign-in link is the join. Your place shows on the waitlist page and in Settings.

### "How do I get the morning push?"
Sign in (Settings → "Sync across devices"), then toggle Notifications. Your browser will ask for permission. We send one push per day at the drop time. No marketing pushes, ever.

### "I'm not getting push notifications."
- Check Settings → Notifications is on.
- Check your browser/OS hasn't muted notifications for the site.
- Reinstall the PWA (delete from home screen, re-add), old service workers occasionally get stuck.
- If still broken after that, reply with your OS + browser.

### "I want to delete my account / data."
Sign out, then email support. We remove your `profiles`, `follows`, `push_subscriptions`, and `listens` rows on request. Reply with the email you signed up with.

### "Is this free? What's the catch?"
The daily drop is always free, no ads, no card. A free account unlocks all six pundits and syncs your settings. There is nothing to pay for right now; a paid tier may return later when there are features worth paying for. We use only cookieless Plausible analytics.

### "How do I manage or cancel Full Time Pro?"
Pro is currently parked and nothing is charged. If an account ever holds an active subscription, Settings shows a Manage billing button that opens the secure Stripe portal (update card, cancel anytime; Pro stays active until the end of the paid period).

### "Can I share a recap?"
Per-episode share links are coming. For now: screenshot the card and tag us on the channel you're sharing to.

### "Why no comments / community?"
By design. We're the morning briefing, not a forum. There are great football forums, go there.

### "Can I install this as an app?"
Yes, it's a PWA. On iOS: Share → Add to Home Screen. On Android: the menu offers "Install app" automatically.

### "Can you do my league / women's football / lower divisions?"
On the roadmap. Tell us which one, we prioritise by request volume.

## Common bug reports → first diagnosis

| Report | First thing to ask / check |
|---|---|
| "App is blank" | What OS / browser? Hard refresh? Cache issue? |
| "Player won't play" | Is it the seeded demo (simulated audio) or a real recap? |
| "Score is wrong on the card" | Is the score wrong in `/feed` too? If only on home, frontend bug; if both, data bug. |
| "Wrong team is leading" | Source data bug, log the match id, escalate to dev |
| "Audio cuts off" | Likely TTS truncation, log the episode id, escalate |
| "Sign in link didn't arrive" | Check spam. Try a different email if the first doesn't arrive within 5 min. |

## Escalation

- Safety / hallucination → tag content-safety (`05-content-safety.md`), product, legal.
- Outage → ops on-call (`06-ops.md`).
- Press / partnership inquiry via support → forward to BD (`08-sales.md`).
- Legal / data-deletion request → legal (`11-legal.md`) within 30 days.
