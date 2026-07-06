# 14 · Build Plan (production push, 2026-06-17)

> **STATUS (2026-07-06): SUPERSEDED / HISTORICAL.** This is the original build plan. It is kept for provenance. Current reality: generation is Anthropic Opus writer + code gate + Sonnet judge (fail-closed), TTS is ElevenLabs, and monetization (Free + Pro $4.99/mo, Stripe test key) is wired. For the current system see `03-architecture.md`, `04-data-model.md`, `06-ops.md`, and the `12-roadmap.md` decision log.


**Role:** Any agent or human executing the migration off Lovable and the push to a production, go-to-market launch.
**Read this when:** you are building Full Time toward launch. It is the canonical contract for this push and supersedes assumptions in `12-roadmap.md` where they conflict.
**Companion artifacts (full detail, kept in `full-time/_spec/`):** the Magic Spec (voice bible, synthesis engine, humour system, sample drops) in `magic-spec-raw-wf_b691c0ec.json`; the production audit in `full-time/_audit/`. The two source corpora live in `full-time/` (Research Corpus, and The Magic Moment).

---

## 1. What Full Time is (locked)

A daily AI-narrated football recap. 60 seconds per match, Big-5 leagues, one morning drop, tap-once PWA. It wins on a **sensibility**, not a mechanic: a **calm-voice, sharp-writing** Honest Narrator, plus a **machine-only Intelligence Synthesis** coda that connects dots across all five leagues no human pundit could at 06:45, plus **identity-safe deadpan humour**, on an **accuracy floor where the model only phrases facts the engine already proved true** from a **founder-editable voice corpus**.

One line: *the only football audio that reads everything at 06:00, tells you what matters in the time it takes to drink a glass of water, notices what nobody else did, and never gets a score wrong.*

## 2. Locked decisions (founder interview, 2026-06-17)

**Strategy**
- Monetization: audience-first. v1 is free, no paywall, no Stripe. Architecture stays monetization-ready (clean Pro-tier seams) but nothing is wired.
- Quality bar: full public launch. Real data, accurate audio daily, polished, monitored, legally clean, survives a Reddit/press hit.
- Scope: Big-5, one morning drop, PWA-first. Harden, do not widen. (No women's/cups/expansion in v1.)
- AI posture: all-in on AI-as-superpower AND novel-first/viral.

**Creative heart**
- Voice: single fixed **calm reporter**, OpenAI TTS at launch, Google TTS multilingual fallback, ElevenLabs a Phase-2 timbre upgrade (not a launch dependency). Delivery calm, writing sharp.
- Opinion: **honest observation, no staked verdict** (Strategy 5 "confidently wrong take" is OUT).
- Humour: **calibrated**, ~1 dry deadpan moment per recap, identity-safe and screenshot-proof (mock the game/situation/absurd, never a club/player/manager).
- Personalization: **hybrid** render (shared verified-once match audio library + thin per-listener layer). At launch: **your clubs first + light direct-address framing**.
- Synthesis coda: the machine-only "one thing we noticed while you were asleep." **Curated-first, then automate** (human approves before a coda ships, until the engine is proven).
- The voice + humour live in an **editable `voice_corpus`** the founder trains over time.

**Data / ops / distribution**
- Data: **two feeds**, API-Football primary + football-data.org cross-check (two-feed agreement gate). Add an xG/archive tier when the richer synthesis classes need it.
- Drop timing: **per-timezone 07:00 fanout** over a pre-rendered library (not a single UTC fire).
- Distribution v1: PWA + **per-episode share page + clip cards + social auto-posting + podcast RSS digest**.
- Publish gate: recaps publish **autonomously once the fact-grounding gate passes** (coda stays curated-first).
- Legal: documented rights-safe posture (public facts only, original prose, clear AI disclosure, no club/league marks, no broadcaster audio, "independent and unofficial"); reactive; monitored.
- LLM: move script generation **off the Lovable AI Gateway** onto Krish's own OpenAI keys.

## 3. The 60-second format (the container for the magic)

```
[0-8s]   Lede.    Score, clubs, what happened. One sentence. Never a tease.
[8-30s]  Story.   The goal/card/turning point. One moment, full attention.
[30-50s] Magic.   The honest observation, the stat with a sting, the dry absurdity,
                  or the thing nobody in the studio said. THE forward-worthy sentence.
[50-60s] Forward. One sentence: what it changes / what's next.
```
Morning drop: open on the biggest match, move by stakes, **land the synthesis coda** ("one thing we noticed while you were asleep"), sign off with when Full Time is back.

## 4. Pipeline architecture (the rebuild)

```
Football data (API-Football primary + football-data.org cross-check)
   -> ingest adapter -> matches / match_events / match_stats / players   [two-feed agreement gate]
   -> per match: build grounded fact-pack (score, scorers+minutes, cards, subs, stats)
   -> LLM (OpenAI) writes 4-segment JSON, phrasing ONLY the fact-pack, from the voice_corpus
   -> ACCURACY GATE (fail-closed): restated score == DB score == count(goal events);
        no scorer/entity not in the fact-pack; ends on the real score; banned-terms regex
   -> HUMOUR QA judge: screenshot-safe + identity-safe + lands; reject -> regenerate (feedback, not blind retry)
   -> OpenAI TTS per segment -> FFmpeg stitch -> episodes.audio_url (episodes bucket)
   -> auto-cut 15s magic-sentence clip + OG scoreline image (share bucket)
   -> episode row (status published) -> Realtime feed
Cross-league SYNTHESIS engine (SQL insight classes) -> synthesis_insights (pending)
   -> CURATED approval -> coda audio + card -> drop.synthesis_insight_id -> shipped
Per-timezone fanout: at 07:00 local, push the ready drop to each subscriber's timezone (last_drop_sent guard)
```

**Accuracy is true-by-construction:** the synthesis insight is a computed query result; the LLM is confined to phrasing. A generation-vs-phrasing wall plus the fail-closed gate means a wrong "insight" cannot ship.

## 5. Data model (live on `hzadscrqmyilbisexvyz`)

Base (8): leagues, teams, matches, episodes, profiles, follows, push_subscriptions, listens.
Added (this push): **players, match_events, match_stats, synthesis_insights, voice_corpus, live_commentary, drops**; episodes extended (segments, magic_sentence, forward_line, share_clip_url, og_image_url, locale, model, verification, status; UNIQUE(match_id, locale)); profiles+push_subscriptions gained timezone/locale; storage buckets `episodes` and `share` (public). RLS on all 15 tables; synthesis_insights public-reads `shipped` only; voice_corpus is service-role only.

## 6. Build phases (task list mirrors this)

0. **Foundation** [DONE]: target DB stood up (base + magic-engine schema + buckets), verified.
1. **Football data adapter** (two-feed). Gated on the football-data key; build against the interface + fixtures now.
2. **Generation pipeline rewrite**: OpenAI 4-segment from voice_corpus + fact-grounding gate + humour QA + OpenAI TTS + stitch (replaces Lovable AI + ElevenLabs).
3. **Intelligence Synthesis engine** + curated-coda admin.
4. **Distribution + virality**: share page + OG + clip cards + social auto-post + RSS digest.
5. **Per-timezone fanout + cron security (CRON_SECRET) + secrets** on target + boot-time validation.
6. **Frontend polish + PWA**: your-team-first + framing, remove mock/simulator, fix voice enum, install prompt, AI disclosure.
7. **Repoint + deploy + live-verify** (Vercel) + auth config (Resend SMTP, redirect allow-list) + monitoring + CI + content-safety regression test.
8. **Full Time Live** (Phase 2 fast-follow): minute-by-minute *text* commentary in the Full Time voice off the live feed (table wired now).

## 7. Open blockers / founder actions

- **Football data API key** (API-Football via RapidAPI and/or a football-data.org token). Not in the API set. Real matches cannot render until provided. Everything else is built against the interface.
- Target Supabase `hzadscrqmyilbisexvyz` is reachable via the Management API token only (MCP connector is in a different org). The Lovable source (`ugtzytdbczfagrngciom`) is not reachable and not needed (schema is in-repo, match data is disposable).

## 8. Non-negotiables for any contributor

- No em dashes anywhere (product copy, docs, commits). Periods/commas/colons; "to" for ranges.
- A wrong score or fabricated scorer is brand-ending. The fact-grounding gate is not optional.
- Humour must survive as a silent screenshot and never mock a club/player/manager.
- Verify visually before claiming anything is shipped/live (prod screenshot only).
- New tables ship with GRANT + ENABLE RLS + policies in the same migration.
