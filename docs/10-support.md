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

Full Time is in private verification with no public launch date. The home screen shows only a genuinely current, approved drop. If none has cleared the editorial and narration gates, it says so instead of substituting archive material.

### "Why is my team's match missing?"

We cover the Big Five (Premier League, La Liga, Serie A, Bundesliga, Ligue 1). Cup matches and lower divisions aren't in v1. If you'd like to see them, reply and tell us which league, we track requests.

### "The recap got a fact wrong."

Apologies, please tell us the match and the line that was wrong. We'll take the recap down, fix the prompt, and credit it in our changelog if it's a pattern.

### "How is this made?"

Recaps are written by an AI model (Anthropic's Claude) from publicly available match data (final scores, scorers, minutes, stats), then checked by an automated accuracy pass that blocks the recap if it gets the winner, the score, or a scorer wrong. The voice is synthetic (ElevenLabs). We never use copyrighted broadcast audio. Full disclosure on Settings.

### "Can I pick a different voice?"

All six pundits are free and selectable without an account. Your choice stays on the device; optional sign-in will sync it once the account flow is enabled. Each pundit has a separate script, thesis, prediction record and versioned synthetic performance profile, not just a different voice reading shared copy.

### "What is the archive / name a game?"

Archive material is labelled archive or demo and is never presented as current. On-demand generation remains disabled during private verification; unapproved scripts and audio cannot be published from legacy harnesses.

### "What is the waitlist?"

It is the launch-note list. There is no promised date: public launch waits for all six pundits to pass the editorial, narration, prediction, operational and human-review gates.

### "How do I get the morning push?"

Notifications are paused during private verification. The control remains visibly disabled until approved daily publishing is operational.

### "I'm not getting push notifications."

- Check Settings → Notifications is on.
- Check your browser/OS hasn't muted notifications for the site.
- Reinstall the PWA (delete from home screen, re-add), old service workers occasionally get stuck.
- If still broken after that, reply with your OS + browser.

### "I want to delete my account / data."

Sign out, then email support. We remove your `profiles`, `follows`, `push_subscriptions`, and `listens` rows on request. Reply with the email you signed up with.

### "Is this free? What's the catch?"

The preview and all six pundits are free. New checkout, paid claims and on-demand generation are disabled during private verification. No card is requested.

### "How do I manage or cancel Full Time Pro?"

New subscriptions are disabled. Existing subscribers can still use the secure Stripe portal to manage or cancel an existing subscription.

### "Can I share a recap?"

Approved drops can be shared with a selected-pundit preview. Opening that link does not overwrite the recipient's saved pundit without confirmation.

### "Why no comments / community?"

By design. We're the morning briefing, not a forum. There are great football forums, go there.

### "Can I install this as an app?"

Yes, it's a PWA. On iOS: Share → Add to Home Screen. On Android: the menu offers "Install app" automatically.

### "Can you do my league / women's football / lower divisions?"

On the roadmap. Tell us which one, we prioritise by request volume.

## Common bug reports → first diagnosis

| Report                       | First thing to ask / check                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "App is blank"               | What OS / browser? Hard refresh? Cache issue?                                                                                        |
| "Player won't play"          | Is it a labelled archive/demo row without approved audio, or a current approved pundit variant? The player never simulates playback. |
| "Score is wrong on the card" | Is the score wrong in `/feed` too? If only on home, frontend bug; if both, data bug.                                                 |
| "Wrong team is leading"      | Source data bug, log the match id, escalate to dev                                                                                   |
| "Audio cuts off"             | Likely TTS truncation, log the episode id, escalate                                                                                  |
| "Sign in link didn't arrive" | Check spam. Try a different email if the first doesn't arrive within 5 min.                                                          |

## Escalation

- Safety / hallucination → tag content-safety (`05-content-safety.md`), product, legal.
- Outage → ops on-call (`06-ops.md`).
- Press / partnership inquiry via support → forward to BD (`08-sales.md`).
- Legal / data-deletion request → legal (`11-legal.md`) within 30 days.
