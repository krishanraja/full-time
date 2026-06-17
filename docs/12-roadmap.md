# 12 · Roadmap

**Role:** Product, planning, decision-tracker.
**Read this when:** deciding what's next, or wanting to know why a thing isn't / is in the product.
**Don't read this when:** you're shipping something today (→ `02-developer.md`).

---

## Shipped (v1)

- 8-table data model on Lovable Cloud (`04-data-model.md`).
- Today / Feed / Following / Settings / Auth / Legal routes.
- Real `<audio>` player + MediaSession lock-screen controls.
- Magic-link auth, DB-backed follows, voice preference persistence.
- Realtime episode updates.
- AI pipeline: Gemini 3 Flash → safety filter → ElevenLabs → Storage → DB.
- Cron route + GitHub Actions workflow.
- PWA manifest + push (client + fanout).
- Plausible wiring.
- Brand v1 (this rebrand): logo, wordmark, lime-on-pitch palette, Geist typography, hairline-everywhere UI.
- `/docs` suite (you're reading it).

## Next up (in priority order)

1. **Per-episode share page** (`/episode/{id}` with auto-play + custom OG image).
2. **PWA install prompt** after second visit + second completed listen.
3. **Custom OG / Twitter card** image generator (see `01-brand.md` notes).
4. **Real API-Football adapter** to replace seeded matches (the table shape is already ready).
5. **"Your team first"** personalisation in `getTodayFeed`.
6. **6-min daily digest mp3** stitched server-side, exposed as RSS for Apple/Spotify podcast apps.
7. **Pro tier scaffolding** — Stripe wiring, paywall on the digest mp3, not the daily drop.

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

### 2026-06-17 · Rebrand to lime-on-pitch with hairline UI
- **Context:** Brand felt generic-AI. New logo (electric lime stopwatch) gave us an anchor.
- **Tradeoff:** Lots of component churn for no functional change; small risk of regression in visual hierarchy.
- **Reversible?** Yes — colours and type all live in `src/styles.css`. Reverting is a single-file edit.

### 2026-06-17 · One voice per voice_style, no real-broadcaster cloning
- **Context:** IP and trust risk. `05-content-safety.md`.
- **Tradeoff:** Less novelty, fewer "this sounds like X" moments.
- **Reversible?** No — once we did it, we'd own the consequences forever.

### 2026-06-17 · Free at launch, no ads
- **Context:** `08-sales.md`. Habit before monetization.
- **Tradeoff:** No revenue runway; assumes infra costs covered by current credits.
- **Reversible?** Yes — adding a sponsor tag or Pro tier is straightforward when traffic justifies.

### 2026-06-17 · Big 5 leagues only at v1
- **Context:** Scope control. Other leagues require data adapter work.
- **Tradeoff:** Excludes women's football and cup competitions.
- **Reversible?** Yes — adapter pattern is built into the `matches` shape.

### 2026-06-17 · Cron via GitHub Actions, not pg_cron
- **Context:** Easier to manually trigger and inspect; external observability.
- **Tradeoff:** Adds a dependency on the user's GitHub repo + an Actions secret.
- **Reversible?** Yes — swap to pg_cron later.

### 2026-06-17 · Use Lovable AI Gateway (Gemini 3 Flash) instead of direct OpenAI/Anthropic
- **Context:** No external API key needed; one provider relationship.
- **Tradeoff:** Tied to gateway pricing and model availability.
- **Reversible?** Yes — pipeline is a single fetch call.

### 2026-06-17 · Mock match data at v1
- **Context:** Real API-Football data not yet wired; product shape works fine with seeds.
- **Tradeoff:** Limits launch to soft / friends-and-family until adapter is in.
- **Reversible?** Yes — table shape is adapter-ready (`04-data-model.md`).

---

When you add an entry, **add it to the top** of the decision log and update any other doc the decision affects in the same change.
