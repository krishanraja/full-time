# 16 · Ask Your Pundit (spec stub)

**Role:** Product / whoever builds the next Pro feature.
**Read this when:** you are about to build "ask your pundit a question".
**Status:** NOT BUILT. Named on `/pro` as explicitly-not-included roadmap. This is a stub captured on 2026-08-07 so the idea is not lost, not a finished spec. Expand before building.

---

## The idea

A Pro subscriber can ask a question about a match in natural language and get an answer back in their chosen pundit's voice. "Why did Frosinone lose that?" "Was the penalty soft?" "How many shots did they actually have?"

## Why it fits

It is the only proposed Pro feature that uses the accuracy machinery already built rather than adding a new content pipeline. The engine already assembles a deterministic fact pack per match, already writes in a persona, already runs a code gate plus a judge, and already fails closed. A question is just a different prompt over the same fact pack.

## The hard constraint, inherited

**Answers must be fact-pack-bounded.** The whole product promise is that the model only phrases engine-proven facts. A free-form Q&A is the single easiest way to break that, because a user can ask something the fact pack does not cover. So:

- If the fact pack does not contain the answer, the pundit says so in character. It does not reason from general football knowledge, and it does not guess.
- The same code gate applies: every number in the answer must appear in the fact pack.
- The judge pass runs on answers exactly as it does on recaps.
- Fail-closed beats a plausible answer, every time.

## Open questions, all unanswered

1. **Scope of a question.** One match only, or cross-match ("has Frosinone been this wasteful all season")? One match is far safer and is where the fact pack already is.
2. **Rate limiting.** Each question is an LLM call plus possibly a TTS render. Does it share the name-a-game daily allowance, or get its own? Sharing is simpler and honest, since both cost the same kind of money.
3. **Text or audio.** Text is cheap and instant. Audio is the product's whole character. Probably text first, with a play button that renders on demand.
4. **Where it lives.** On the episode page under the transcript is the obvious home, since the transcript is already the textual surface.
5. **Persona conditioning.** Distinct per-pundit narration is still "rolling out". If the six pundits do not yet sound different, an answer "in your pundit's voice" is a claim we cannot honour. This probably has to land after per-pundit narration, not before.
6. **Abuse.** Prompt injection through the question field into a system that has a service-role client nearby. The Q&A path must never touch anything but the fact pack.

## Definition of done

Not "it answers questions". It is done when it refuses correctly: a question outside the fact pack gets an honest in-character "I do not have that", and the golden set proves it does that reliably. Until that holds, it does not ship, and it stays in the `NEXT_UP` block on `/pro` rather than the ticked feature list.
