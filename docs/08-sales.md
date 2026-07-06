# 08 · Sales / BD

**Role:** Sales, business development, partnership-facing agent.
**Read this when:** considering monetization, approached for a partnership, talking to a rights holder.
**Don't read this when:** doing direct-to-consumer marketing (→ `07-marketing.md`).

---

## Current monetization stance

**Free, plus a paid tier that is deliberately not charging anyone yet.** No ads.

A Pro tier now exists in the product: **Full Time Pro, $4.99/mo USD**, wired end-to-end through Stripe. But it runs on the **Stripe test key**. There are no real charges, and there is **no revenue**. That is on purpose.

Why we are not charging real money yet:
- **0 users.** Charging before there is an audience is premature. The product has to earn the daily habit before it earns money, and adding friction at launch kills the loop.
- **The Pro features that would justify a price are mostly not built.** Today Pro gates one thing (pundit selection, below). The rest is promised, not shipped. We are not going to take real money for a promise.
- We have no negotiating leverage with rights holders, sponsors, or partners until we have audience.
- The unit economics on TTS + bandwidth are manageable at our scale (see `06-ops.md`).

The honest read: the plumbing is done so that flipping to live is a config change, not a build. The gate on going live is **audience plus real Pro value**, not engineering.

## Full Time Pro (what actually exists today)

- **Price:** $4.99/mo USD.
- **Status:** live in code, wired to Stripe on the **test key**. No live charges, no revenue. Deliberately test-only.
- **What Pro gates today:** **pundit selection.** Free users get **"The Reporter"** only. The other five pundits are Pro. This is enforced in three places, the UI, the server, and a database guard trigger. The billing columns are `service_role`-only, which closed a self-grant-Pro hole (a free user cannot flip their own account to Pro).
- **What is "rolling out" (shown as a Pro benefit but NOT built yet):** clubs-first, all leagues, archive. Do **not** market these as available. They are aspirational until they ship.
- **What Pro must never paywall:** the core daily drop, push notifications, and team-follow personalization. That is the loop, and it stays free forever.
- **Files:** `billing.functions.ts`, `api/stripe/webhook.ts`, `stripe.server.ts`, `billing-sync.server.ts`, `entitlement.ts`, `use-entitlement.ts`, `pro.tsx`.
- **Env:** `STRIPE_SECRET_KEY` (test), `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
- **To go live (when the time is right):** build the real Pro features, create a live-mode Stripe webhook, swap the three Stripe env vars above to live values, redeploy. Until pundit selection is joined by genuine Pro value, leave it on test.

## Future paths (in priority order)

### 1. Light, brand-safe sponsorship
- A single 5-second sponsor tag in the morning push and at the top of `/feed`. Not in-audio.
- Target: football-adjacent but not betting (kit brands, boots, energy drinks, sports media).
- **Hard nos:** betting, alcohol-led campaigns aimed at under-25s, crypto, fast-fashion fan-jerseys.

### 2. Deepen Pro into something worth paying for
- Pundit selection alone is a thin reason to pay. The path to a real, live-charging Pro is to ship the benefits currently marked "rolling out": clubs-first, all leagues, archive. Add longer recaps and a full-week digest push if the audience wants them.
- **Do not** paywall: the core daily drop, push notifications, the team-follow personalisation. These are the loop.

### 3. White-label
- Recaps for a league's official app (LaLiga, Bundesliga, women's leagues). Their content rights, our pipeline.
- Pricing: per-recap or flat monthly. Requires legal carve-out. See `11-legal.md`.

### 4. Affiliate (deprioritised)
- Kit / shirt links per team. Easy to add, low-trust outcome. Only if it doesn't dent the brand.

## Conversations with rights holders

If a league, club, or broadcaster reaches out:

- **Confirm our stance**: we generate recaps from publicly available match data (final scores, scorers, minutes), with synthetic voices, and we don't use any copyrighted broadcast audio, real-broadcaster impressions, or proprietary highlight clips.
- **What we'll happily do**: link out to their official highlights, credit feeds, run a "official partner" badge in exchange for data access.
- **What we won't do without legal sign-off**: embed their content, use their broadcaster voices (even with permission, see `05-content-safety.md`), or pay a per-recap rights fee at this scale.
- Loop in legal before promising anything (`11-legal.md`).

## Conversations with sponsors

- Send the deck (not yet written, see `12-roadmap.md`).
- Quote audience size from Plausible. Never invent numbers.
- Sponsor placement is **brand mention only**, no audio inserts in the recap itself. The recap is the product; protect it.
- Three-month minimum contract. We don't churn week-to-week sponsors.

## Conversations with other apps / podcast networks

- Cross-promotion is fine and free.
- Acquisition: we are too early to entertain. Politely decline, ask them to follow the public roadmap.

## Pricing thinking (for when we get there)

- Free tier remains the daily morning drop, push, follows. Forever.
- Pro tier targets the user who'd happily pay for The Athletic: football-literate, 25 to 45, urban, already paying for three or more subscriptions.
- Price point is set at **$4.99/mo**. Don't discount below it; a low anchor undersells the product. An annual option can follow once monthly Pro proves it retains, but there is no annual price today, so don't quote one.
- When Pro earns its price (real features, some audience), an annual plan with a free month and a downloadable per-month digest is a natural add.

## What "sales" means in v1

Mostly *not selling*. The job is keeping the door closed to bad partners and open to the right ones. A price now exists in the product, but it is deliberately inert: no real charges, no revenue. The number we measure is not revenue, it is habit-forming retention (`00-product.md`).
