# 12 · Roadmap

**Role:** Product, planning, decision-tracker.
**Read this when:** deciding what's next, or wanting to know why a thing isn't / is in the product.
**Don't read this when:** you're shipping something today (→ `02-developer.md`).

---

## Launch status (as of 2026-08-07): billing is ON, daily generation is still off

Read this first. This is the single source of truth for exactly where each stands and what flips it on. Live billing moved from "parked" to **live** on 2026-08-07; daily generation is unchanged and still inert.

### 1. Daily generation (the automated morning drop)

**Status right now: BUILT, DEPLOYED, PROVEN, and INERT.** The full engine (deterministic fact-pack, Opus writer, code gate, Sonnet judge, fail-closed, ElevenLabs TTS) is live and was proven end to end on production. The daily cron is hardened (`CRON_SECRET` bearer auth, bounded concurrency, idempotent) and deployed. It generates **nothing** today because (a) match data is seeded from the 2023-24 season and the cron only looks at recently finished matches, and (b) the GitHub Actions schedule has no secrets set. A manual or scheduled run today returns `{processed:0, created:0}`. That is the **expected** result, not a fault, and **no AI spend happens.**

**Required next, in order:**

1. Wire a **live match-data ingest** (API-Football) that keeps `matches`, `match_events`, and `match_stats` current. Until this exists there is nothing to generate. This is the real blocker.
2. Set two **GitHub repo secrets** to activate the schedule: `CRON_SECRET` (must equal the Vercel env var of the same name) and `FULL_TIME_URL` = `https://fulltime.fm`.
3. Accept the **ongoing cost**: once live, each published episode is about one Opus writer call (plus up to 5 regens), one Sonnet judge call per attempt, and one ElevenLabs render. See `06-ops.md` cost watch.

Step 1 is what produces real content. Steps 2 and 3 turn the schedule on. Do not expect episodes before step 1.

### 2. Live billing (charging real money for Pro)

**Status right now: LIVE (2026-08-07).** Production runs live Stripe keys on account `acct_1Siiex`; preview and development stay on the test key so a preview deploy cannot transact. Live webhook `we_1U1pNgHqiZo6hj3eKkJ1xgIS` → `https://fulltime.fm/api/stripe/webhook`, subscribed to the six events the handler switches on and verified by signing a payload with the live secret (`200 {"received":true}`; unsigned `400`, bogus `400`). A real live Checkout Session was opened at $4.99 and expired. `/pro` is a pricing page again, so checkout is reachable.

**What Pro gates**, both enforced server-side, both pre-existing:

1. **All six pundits.** `setVoiceStyle` re-reads the profile and rejects a Pro pundit for a non-Pro caller. Anonymous and free keep The Reporter and The Gaffer.
2. **25 name-a-game narrations a day** against the free 3. `limitFor` resolves the allowance per profile; `getArchive` returns it as `dailyLimit`.

**Still open, and they matter:**

1. **Publish subscription terms on `/legal/terms` and a refund policy.** Live billing was switched on ahead of both. Tracked as an open compliance gap in `11-legal.md`. Do not promote Pro until these exist.
2. **Make pundit selection actually change the narration.** Selection is gated and real; distinct per-pundit narration is still "rolling out", so keep the hedge.
3. **Rotate the Stripe live secret** pasted into a chat on 2026-08-07.

---

## Shipped (v1)

- 15-table data model on Supabase (`04-data-model.md`).
- Today / Feed / Following / Settings / Auth / Legal routes.
- Real `<audio>` player + MediaSession lock-screen controls.
- Magic-link auth, DB-backed follows, voice preference persistence.
- Realtime episode updates.
- Cron route + GitHub Actions workflow.
- PWA manifest + push (client + fanout).
- Analytics wiring (done: PostHog, 2026-08-05).
- Brand v1 (this rebrand): logo, wordmark, lime-on-pitch palette, Geist typography, hairline-everywhere UI.
- `/docs` suite (you're reading it).

## Shipped (2026-07-06)

- **Full Time Pro** ($4.99/mo USD) wired via Stripe on the account `acct_1Siiex` (an old Lockstep account repurposed), on the TEST key at the time. *(Superseded 2026-08-07: production moved to live keys and Pro was un-parked.)* The one Pro benefit that enforced then was pundit selection: free gets "The Reporter" (zen), the other five pundits are Pro. Enforced in the UI, in the server `setVoiceStyle`, and by a DB guard trigger `enforce_profile_billing_guard`, which also closed a real self-grant-Pro RLS hole. Code: `src/lib/api/billing.functions.ts`, `src/routes/api/stripe/webhook.ts`, `src/lib/stripe.server.ts`, `src/lib/billing-sync.server.ts`, `src/lib/entitlement.ts`, `src/hooks/use-entitlement.ts`, `src/routes/pro.tsx`; migration `supabase/migrations/20260705120000_billing.sql`.
- **Accuracy-by-construction generation engine** (`src/lib/api/recap-generator.server.ts` + `runEpisodePipeline` in `src/lib/api/episode-pipeline.functions.ts`), replacing the old fact-starved Lovable AI Gateway path. Deterministic fact-pack from `match_events` (goal log with running score, per-team scorer summary, own-goal and penalty tagging, cards, full-match stats) -> Anthropic Opus writer conditioned on the `voice_corpus` persona -> deterministic code gate (exact final score, scorers a diacritic-normalized subset of the fact-pack, 105 to 135 words, no repeated score or minute, no banned cliches, no em dashes) -> Sonnet contradiction judge (wrong winner, wrong score, or a goal credited to the wrong team) -> up to 5 surgical regens. Fail-closed: it publishes no episode rather than a wrong one. Then ElevenLabs TTS (Daniel) -> Supabase Storage -> `episodes` row. Proven end-to-end on production, passing the gate and judge on the first attempt with real audio.
- **Your team first**: follows now reorder `getTodayFeed` via home/away/league ids, so a followed club leads the drop.
- **Continuous playback**: the player store has a queue with auto-advance, a "Play the morning" button on Today, and MediaSession next/prev.
- **Hardened daily-drop cron** (`src/routes/api/public/cron.daily-drop.ts`, scheduled by `.github/workflows/daily-drop.yml` at 06:30 UTC): requires a `CRON_SECRET` bearer token (previously it trusted the public Supabase publishable key), runs generation with bounded concurrency (3) under a 240s wall-clock budget to stay inside the 300s serverless limit, and is idempotent (skips matches that already have an episode). Inert until a live match-data feed exists.
- **Honesty sweep**: removed the false always-on "Live drop" badge (the product is deliberately day-after, not live) and replaced it with a static "Daily"; hedged the Pro pundit copy to "rolling out"; restored pinch-zoom by removing `viewport maximum-scale=1`.

## Shipped (2026-07-06, archive + name-a-game)

- **/archive, free-gated**: every finished match we hold data for, league filter chips, signed-out state is an honest teaser (real counts) with one sign-in ask. Nav gained an Archive tab.
- **Name a game**: a match with an episode plays instantly; a match with event data gets a "Narrate" button that runs the fail-closed engine on demand (`requestEpisode`: signed-in only, 3 per user per UTC day, failed attempts not counted, ledger in `generation_requests`, service_role-only). The unauthenticated `generateEpisodeForMatch` server fn was REMOVED (it let anyone spend Anthropic/ElevenLabs money).
- **Additive ingest tooling** (`_ops/ingest-rounds.mjs`, `_ops/backfill-events.mjs`): pull whole rounds or enrich bare matches without deleting anything, budget-capped for the API-Football free tier. The old `_ops/ingest.mjs` is destructive (wipes episodes); do not re-run it.

## Shipped (2026-07-06, access ladder + waitlist)

- **Access ladder** (`15-access-and-waitlist-plan.md`): anonymous gets recent drops + two pundits (The Reporter, The Gaffer; pick kept in localStorage); a free account unlocked all six pundits; Pro parked. *(Superseded 2026-08-07: the four extra pundits moved back behind Pro and `/pro` is a pricing page again.)*
- **Waitlist for the full app**: `waitlist` table (own-row RLS + `waitlist_guard` trigger so a user cannot backdate `joined_at` or set ops fields; position computed by a service_role count), `/waitlist` page (honest live-today vs full-app split, one-tap join for signed-in, magic-link-is-the-join for anonymous via `?join=1` auto-join), join CTAs on Today and Settings, position shown only from a confirmed row. Migration `20260706150000_waitlist.sql`. New analytics events: `waitlist_join`, `signin_gate_shown`.

## Next up (in priority order)

1. **Real API-Football ingest** to turn on daily generation. The pipeline, gate, judge, and cron are all built and hardened, but the cron is inert until a live match feed exists (current match data is seeded from the 2023-24 season and the cron is date-filtered to recent finished matches). This unlocks real daily content and accepts ongoing Anthropic plus ElevenLabs cost. To activate the schedule the operator also sets two GitHub repo secrets: `CRON_SECRET` (matching Vercel) and `FULL_TIME_URL`.
2. **Subscription terms + refund policy**, then Pro features beyond the two live gates. Billing is live but must not be promoted until `/legal/terms` carries subscription terms and a refund policy exists (`11-legal.md` open compliance gap). After that, make pundit selection actually change the narration, then "ask your pundit" (`16-ask-your-pundit.md`).
3. **Distribution surfaces.** Per-episode share page (`/episode/{id}` with auto-play + custom OG image), custom OG / Twitter card image generator (see `01-brand.md` notes), PWA install prompt after a second visit and a second completed listen, and a 6-min daily digest mp3 stitched server-side and exposed as RSS for Apple/Spotify podcast apps.

## Backlog (no commitment)

- Women's football (WSL, NWSL).
- League cup / continental competition coverage.
- Per-team push channels (only your team triggers a push).
- Native iOS app (only after PWA install >40% of MAU).
- Voice cloning of the user's own voice for the digest (privacy-loaded, defer).

## Explicitly NOT doing

These have been considered and rejected. Re-opening requires a new decision-log entry that addresses the reason for rejection.

| Idea | Why no | Date |
|---|---|---|
| League standings / fixtures pages | Out of scope; not our shape | 2026-06-17 |
| Comments / replies / community | Adds moderation cost, dilutes brand | 2026-06-17 |
| Live commentary | Different product entirely; rights-loaded | 2026-06-17 |
| Real-broadcaster voice impressions | IP + trust hazard, see `05-content-safety.md` | 2026-06-17 |
| Betting integration | Brand-incompatible, see `08-sales.md` | 2026-06-17 |
| Ads in the recap audio | Breaks the core promise | 2026-06-17 |
| Required login | Violates the "tap once" promise | 2026-06-17 |

## Decision log

Format: **Decision · Context · Tradeoff · Reversible?**

### 2026-08-07 · Pro un-parked and put on live Stripe keys
- **Context:** Founder instruction, taken after it was shown that Pro gated nothing at all: the 2026-07-06 decision below had moved the pundit gate down to the free account, so `isPro` only rendered a "thank you" card. Live keys were wired first (live webhook, env split production=live / preview+dev=test), then `/pro` was un-parked and given two benefits that already existed and are enforced server-side: all six pundits, and 25 name-a-game narrations a day against the free 3. Spec: `15-access-and-waitlist-plan.md` addendum.
- **Tradeoff:** Free accounts lose the four extra pundits they had since 2026-07-06. Accepted explicitly as the price of the paid tier having a real day-one benefit rather than an empty promise. Billing also went live ahead of published subscription terms and a refund policy, which is now an open compliance gap in `11-legal.md`.
- **Reversible?** Yes, cheaply. The gates are constants in `src/lib/entitlement.ts` plus the `/pro` route; reverting is a copy change and a redeploy. Any real subscription taken in the meantime would need refunding through the Stripe portal.

### 2026-07-06 · Anonymous / free-account / waitlist ladder; Pro parked (SUPERSEDED 2026-08-07)
- **Context:** Founder direction: the app must sell itself without login, a free account is the unlock (all six pundits now; archive and name-a-game next), and the waitlist for the full app is both the demand proof and the launch trigger for live daily generation. Pundit selection moved from Pro to free-account; `/pro` redirects to `/waitlist`; billing plumbing stays wired on the test key but gates nothing. Spec: `15-access-and-waitlist-plan.md`.
- **Tradeoff:** No paywall signal at all until Pro returns; the waitlist number becomes the metric that matters.
- **Reversible?** Yes. The entitlement seam is intact; re-gating anything on Pro is a constant change plus copy.

### 2026-07-06 · Free plus Full Time Pro at $4.99/mo (reverses "Free at launch")
- **Context:** Monetization is wired now via Stripe (account `acct_1Siiex`, an old Lockstep account repurposed), deliberately on the TEST key so no real charges happen yet. The only Pro benefit that actually enforces today is pundit selection: free gets "The Reporter" (zen), the other five pundits are Pro, enforced in the UI, in server `setVoiceStyle`, and by a DB guard trigger. The other benefits (your clubs first, all leagues, full archive) are marketed honestly as "rolling out". This closed a real self-grant-Pro RLS hole, since the billing columns are now writable only by `service_role`.
- **Tradeoff:** Carries a billing surface and a Stripe dependency before we have real users; on the test key there is no revenue yet.
- **Reversible?** Yes. Entitlement is one gate (`src/lib/entitlement.ts` + `use-entitlement`), and the test key can be swapped for live or removed. See `08-sales.md`.

### 2026-07-06 · Anthropic Opus writer with code gate and Sonnet judge (reverses "Lovable AI Gateway / Gemini 3 Flash")
- **Context:** The old gateway path was fact-starved and non-functional. The engine now builds a deterministic fact-pack from `match_events`, has Opus write conditioned on `voice_corpus`, runs a deterministic code gate (exact score, scorers a subset of the fact-pack, word count, no repeats, no banned cliches, no em dashes), then a Sonnet contradiction judge (wrong winner, wrong score, goal to the wrong team), with up to 5 surgical regens. Fail-closed: it publishes nothing rather than a wrong episode. Accuracy is guaranteed by construction, not by a prompt instruction. Proven end-to-end on production.
- **Tradeoff:** Two model relationships (Anthropic plus ElevenLabs), a per-episode Anthropic cost, and more moving parts than a single fetch.
- **Reversible?** Partly. The model ids are env-configurable (`WRITER_MODEL`, `JUDGE_MODEL`), but reverting to a single-pass model would give up the by-construction accuracy.

### 2026-07-06 · Your team first, shipped
- **Context:** Follows now reorder `getTodayFeed` via home/away/league ids so a followed club leads the drop, keeping the "your clubs first" promise for ordering even while the fuller Pro personalization is still rolling out.
- **Tradeoff:** Extra sort logic in the feed query; minor.
- **Reversible?** Yes. It is a sort in `getTodayFeed`.

### 2026-07-06 · Continuous playback, shipped
- **Context:** The player store now has a queue with auto-advance, a "Play the morning" button on Today, and MediaSession next/prev, so the morning drop can play straight through.
- **Tradeoff:** More player state to maintain.
- **Reversible?** Yes. The queue is additive to the existing single-episode player.

### 2026-07-06 · Honesty sweep
- **Context:** Removed the false always-on "Live drop" badge (the product is deliberately day-after, not live) and replaced it with a static "Daily"; hedged the Pro pundit copy to "rolling out"; restored pinch-zoom by removing `viewport maximum-scale=1`.
- **Tradeoff:** Less urgent-sounding copy; we say what is true.
- **Reversible?** Yes. All copy plus one viewport meta tag.

### 2026-06-17 · Rebrand to lime-on-pitch with hairline UI
- **Context:** Brand felt generic-AI. New logo (electric lime stopwatch) gave us an anchor.
- **Tradeoff:** Lots of component churn for no functional change; small risk of regression in visual hierarchy.
- **Reversible?** Yes. Colours and type all live in `src/styles.css`. Reverting is a single-file edit.

### 2026-06-17 · One voice per voice_style, no real-broadcaster cloning
- **Context:** IP and trust risk. `05-content-safety.md`.
- **Tradeoff:** Less novelty, fewer "this sounds like X" moments.
- **Reversible?** No. Once we did it, we'd own the consequences forever.

### 2026-06-17 · Free at launch, no ads
- **Context:** `08-sales.md`. Habit before monetization. Superseded by the 2026-07-06 Pro decision above (monetization is now wired on the Stripe test key).
- **Tradeoff:** No revenue runway; assumes infra costs covered by current credits.
- **Reversible?** Yes. Adding a sponsor tag or Pro tier is straightforward when traffic justifies.

### 2026-06-17 · Big 5 leagues only at v1
- **Context:** Scope control. Other leagues require data adapter work.
- **Tradeoff:** Excludes women's football and cup competitions.
- **Reversible?** Yes. Adapter pattern is built into the `matches` shape.

### 2026-06-17 · Cron via GitHub Actions, not pg_cron
- **Context:** Easier to manually trigger and inspect; external observability.
- **Tradeoff:** Adds a dependency on the user's GitHub repo + an Actions secret.
- **Reversible?** Yes. Swap to pg_cron later.

### 2026-06-17 · Use Lovable AI Gateway (Gemini 3 Flash) instead of direct OpenAI/Anthropic
- **Context:** No external API key needed; one provider relationship. Superseded by the 2026-07-06 Anthropic Opus decision above.
- **Tradeoff:** Tied to gateway pricing and model availability.
- **Reversible?** Yes. At the time the pipeline was a single fetch call.

### 2026-06-17 · Mock match data at v1
- **Context:** Real API-Football data not yet wired; product shape works fine with seeds.
- **Tradeoff:** Limits launch to soft / friends-and-family until adapter is in.
- **Reversible?** Yes. Table shape is adapter-ready (`04-data-model.md`).

---

When you add an entry, **add it to the top** of the decision log and update any other doc the decision affects in the same change.
