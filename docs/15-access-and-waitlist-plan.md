# 15 · Access Model + Waitlist Plan

**Role:** Product / any agent building the launch access model.
**Read this when:** implementing the anonymous / free-account / waitlist ladder, or deciding what gates where.
**Don't read this when:** you need the shipped truth (this is a PLAN; `12-roadmap.md` launch status is what is live).

**STATUS: Phases 1 to 3 BUILT and DB-verified 2026-07-06 (see `12-roadmap.md` Shipped); production deploy pending founder approval. Phase 4 (launch trigger) remains gated on the waitlist threshold.** Docs 00/08/09/10/11/12/13 were updated in the same change.

---

## The strategic frame

Founder decision: **the live daily product (blocker #1, the API-Football ingest + scheduled cron) turns on when the waitlist proves demand.** Until then the app must be genuinely usable and self-selling without it. That gives three jobs:

1. Make the app real for a visitor with zero friction (anonymous).
2. Give a reason to create a free account (more pundits, archive, name a game, persistent settings).
3. Capture demand for the full app (waitlist), which is both the launch trigger and the target of the entire pre-launch GTM motion (see `_audit/2026-07-06-GTM-DOCS-READINESS.md`).

Pro ($4.99) is **parked, not deleted**: plumbing stays, test key stays, but Pro stops gating anything user-visible. The pundit gate moves from Pro to free-account.

## The access ladder

| Tier | Identity | Gets |
|---|---|---|
| **Anonymous** | none | Recent drops with full audio, continuous playback, the coda, local-only follows and club-first ordering (already local-first), and a **taste of pundits: The Reporter + one more** (preference in localStorage). |
| **Free account** | magic link, $0 | Everything anonymous has, plus: **all 6 pundits**, the **full archive**, **name a game** (on-demand recap of any match we have data for), and persistent settings (follows sync, voice pref, push opt-in). |
| **Waitlist** | free account + flag | Reserved place in the **full app**: live daily drops by 7am local, push fanout, every matchday, all leagues. Joining = one tap when signed in; an anonymous join sends the magic link first, so every waitlist member is a free account. One identity system, no separate email list, no ESP dependency. |
| **Pro (parked)** | Stripe, test key | Nothing user-visible for now. `/pro` route is repurposed as the waitlist page. Billing code, webhook, guard trigger, and entitlement seam all stay intact for the future paid tier. |

**Honesty constraint carried over:** distinct per-pundit narration is still "rolling out". Pundit *selection* is real; narration variation is not built. Copy must keep the hedge until name-a-game generates per-pundit for real (Phase 2 makes it the testbed).

## Build phases

### Phase 1: Flip the access model (1 to 2 days)
1. `src/lib/entitlement.ts`: introduce tiers `anon | free | pro`. Replace `FREE_VOICE_STYLE`/`PRO_VOICE_STYLES` with `ANON_VOICE_STYLES = ["zen", "gaffer"]` and account-gated remainder. Keep `isProProfile` and all billing helpers untouched (dormant).
2. `setVoiceStyle` server check changes from is-Pro to is-authenticated for the four remaining pundits. The DB billing guard trigger is untouched (billing columns stay service-role-only).
3. Anonymous pundit switching: `PersonalitySelector` works signed out for the anon set, preference in localStorage; signed-in path unchanged (persists to `profiles.voice_style_pref`).
4. `/pro` becomes `/waitlist` (route can stay `pro.tsx` internally or be renamed; keep a redirect). Settings Membership card becomes a Waitlist card.
5. Copy sweep across app + docs (`00`, `08`, `10`): free account is the unlock, Pro is not mentioned anywhere user-facing.

### Phase 2: Archive + Name a game (2 to 4 days)
1. **Backfill ingest**: extend `_ops/ingest.mjs` (throttled ~7s, API-Football free = 100 req/day) to load the full 2023-24 season across the Big 5, over several days of budget, or take the cheap paid tier once. This is what makes archive and name-a-game rich instead of a 10-match demo. Matches land in `matches`/`match_events`/`match_stats`; episodes are NOT pre-generated (cost stays on demand).
2. **Archive** (`/archive`): browse episodes by matchday and team from existing tables. Free-gated: anonymous sees the route with locked rows + a sign-in CTA (progressive disclosure, no dead end).
3. **Name a game**: pick league → matchday → match (or search by teams). If an episode exists, play it; if not, run `runEpisodePipeline(matchId)` on demand (~16s proven), with a pending state via realtime. Guards: free-login required, **rate limit 3 generations/day/user** (simple `generation_credits` counter table), bounded concurrency, fail-closed messaging ("we could not verify this one, so we did not publish it") which is the accuracy promise doing marketing.
4. Per-pundit truth path: name-a-game is the low-volume place to wire persona-conditioned generation (voice_corpus persona param + per-pundit ElevenLabs voice id). Start with The Reporter only; add pundits one at a time as the corpus for each is curated. Keep the "rolling out" hedge until each is real.

### Phase 3: Waitlist (1 to 2 days)
1. **Schema**: `waitlist` table (`user_id` PK/FK, `joined_at`, `source`, `referral_code`, `referred_by`, `invited_at`, `cohort`). RLS: user inserts/reads own row; service-role everything else. Migration includes GRANT + RLS + policies per house rules.
2. **UI**: join CTA on Today after a completed listen, the `/waitlist` page (what the full app is, what is live today, honest about the difference), a Settings card. Position = count of earlier `joined_at`. Idempotent join, no double-submit.
3. **Flow**: signed-in = one tap. Anonymous = email field → magic link → account created → waitlist row. Confirmation state shows position.
4. **Legal**: add waitlist to `11-legal.md` data table + `/legal/privacy` in the same change (email, joined_at, referral attribution; retention until launch or deletion).
5. Referral-to-move-up is Phase 3.5, only after basic waitlist proves flow. Pre-registered metric before building it: does a referral loop move weekly signups by 20%+.

### Phase 4: The launch trigger (executes roadmap item #1)
When the waitlist hits the founder-set threshold (recommend **100**), execute in order per `12-roadmap.md` launch status: live API-Football ingest → GitHub secrets (`CRON_SECRET`, `FULL_TIME_URL`) → cron live → accept ongoing Anthropic + ElevenLabs cost → waitlist cohort gets the "we are live" push/email → `07-marketing.md` launch checklist fires. The waitlist page flips to "you are in".

## Metrics (pre-launch north star changes)

Until launch, the fleet steers by: **waitlist signups per week**, anonymous → free-account conversion, and name-a-game usage (proof people want the archive product). Plausible events to add: `waitlist_join { source }`, `name_a_game { generated: boolean }`, `signin_gate_shown { surface }`. The `09-growth.md` completed-listens metric resumes as north star at launch.

## Open decisions for Krish (defaults chosen, flag if wrong)

1. **Anon pundit set**: The Reporter + The Gaffer (default). Any two work; one alone undersells "pundits" as a concept.
2. **Waitlist threshold** to flip on live ingest: 100 (default).
3. **Name-a-game rate limit**: 3/day/user (default), and whether to buy the cheap API-Football paid tier to make the backfill fast instead of a week of free-tier budget.
4. **Referral mechanics**: deferred until the plain waitlist proves flow (default).

## What this supersedes

- Parts of the 2026-07-06 "Free plus Full Time Pro" decision: Pro remains wired but stops gating pundits; the user-visible ladder is anon / free / waitlist. Log this in the `12-roadmap.md` decision log when Phase 1 ships.
- The `/pro` page as an upgrade surface. It becomes the waitlist page.
