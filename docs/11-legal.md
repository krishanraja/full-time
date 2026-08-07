# 11 · Legal

**Role:** Legal advisor, or anyone facing a legal-shaped question.
**Read this when:** a rights holder pings, a data request lands, we're considering a feature with IP implications, we're about to touch billing, or we want to change AI disclosure.
**Don't read this when:** you need product or marketing context (→ `00-product.md` / `07-marketing.md`).

> Not legal advice. This file documents the operating posture. Anything novel goes to qualified counsel.

---

## Operating jurisdictions

- UK and EU users primarily.
- Subject to GDPR / UK GDPR.
- Data is stored in Supabase (Postgres, Auth, Storage); the app is served via Vercel.

## Public legal pages

Two public pages exist:

- `/legal/terms`: Terms of Service.
- `/legal/privacy`: Privacy Policy (carries the processor list below).

Any change here that touches collection, processors, or billing must ship the matching change to those pages in the same commit. Note: subscription terms and a refund policy are not yet finalised on these pages. See "Billing and subscriptions".

## What we collect

| Data | Reason | Retention |
|---|---|---|
| Email (signed-in users only) | Account, magic-link sign in | Until account deletion |
| Display name (optional) | Profile | Until account deletion |
| Voice style preference | Personalisation | Until account deletion |
| Follow list (teams/leagues) | Personalisation | Until account deletion |
| Push subscription (endpoint, keys) | Morning push delivery | Until unsubscribe |
| Waitlist membership (joined_at, source, referral attribution) | Admitting the full-app launch list in join order | Until launch admission or account deletion |
| Listens (episode, completion, timestamp) | Analytics on what to make more of | 12 months, then aggregated |
| Stripe customer id + subscription status (Pro users only) | Billing, Pro entitlement | Until account deletion / subscription end |
| PostHog analytics (first-party cookie for the anonymous id) | Site-wide usage + the custom product events in `09-growth.md` | Whatever the PostHog project's retention is set to. Confirm it in PostHog project settings and record the real number here |

We do not collect: IP-based location, device fingerprints, cross-site identifiers, contacts, microphone, camera.

Card and payment details never touch our servers. Stripe holds them. We store only the Stripe customer id and subscription status, and those billing columns are service_role-only.

## Legal bases (GDPR Art. 6)

- Account data: contract (the user opted in to a service).
- Billing / subscription: contract (the user opted in to Full Time Pro).
- Listens / PostHog: legitimate interest (product analytics), with right to object via account deletion.
- Push: explicit consent (the browser prompt).

## Data subject rights

- **Access / export**: email request → we return a JSON of all rows tied to their `auth.users.id`.
- **Deletion**: email request → we delete `profiles`, `follows`, `push_subscriptions`, `listens`, `waitlist` for that user. Auth row removed via Supabase Auth admin. Confirm within 30 days. If they hold a live subscription, cancel it in Stripe as part of deletion.
- **Correction**: trivial fields (display name) are user-editable; we don't store much else.
- **Portability**: same shape as the export.

Runbook lives partly in `10-support.md`. Legal owns the SLA.

## Billing and subscriptions

Full Time Pro is a paid tier alongside a free tier.

- **Price**: Full Time Pro is $4.99/mo USD, a recurring subscription billed monthly.
- **Processor**: Stripe. Stripe is the processor of record for the payment; card data stays with Stripe and never reaches our servers.
- **Cancellation**: users cancel any time through the hosted Stripe billing portal (Settings → Membership → Manage billing). Cancelling stops the next renewal; Pro stays active until the end of the period already paid for.
- **Live billing is ON as of 2026-08-07.** Production runs live Stripe keys and `/pro` is reachable, so a real card can now be charged. Preview and development stay on the test key.

### OPEN COMPLIANCE GAP (2026-08-07)

Live billing was switched on before two of the three pre-conditions below were met. This is a known, deliberate ordering decision by the founder, recorded here so nobody discovers it by accident. It should be closed before the tier is actively promoted.

| Pre-condition | Status |
|---|---|
| Live-mode Stripe webhook + the three env vars swapped to live | **DONE** 2026-08-07 |
| Subscription terms published on `/legal/terms`: renewal cadence, price, what Pro includes, how to cancel | **NOT DONE** |
| Refund policy finalised. UK/EU consumer cancellation and cooling-off rights for digital services apply; counsel to confirm the wording and whether we take the immediate-delivery-with-waiver route | **NOT DONE** |

Mitigating facts, not excuses: there are no subscribers yet, cancellation genuinely works through the hosted Stripe portal, and what Pro gates is now real and enforced rather than promised. The audit view is unchanged: **publish the subscription terms and the refund policy before promoting Pro to anyone.**

## AI disclosure (our public stance)

We disclose, prominently, on Settings:

> Recaps on Full Time are generated by AI from publicly available match data. Voices are synthetic. No copyrighted broadcast audio is used.

We also tag every player surface with `AI · {duration}`. This is non-negotiable. See `05-content-safety.md` for the technical pipeline that backs the disclosure.

## IP posture

What we do:

- Use **final match scores and scorers**. These are facts, not copyrighted compositions.
- Generate **original prose** narrating those facts (model + our prompt). Output is our work.
- Synthesize voice via ElevenLabs under their licence. We hold ElevenLabs commercial-use entitlement for the generated audio.
- Host the audio in our Storage bucket; serve under our domain.

What we don't do:

- Reuse any broadcaster's audio, even snippets.
- Reuse any broadcaster's transcript.
- Imitate a named real broadcaster's voice or style. `05-content-safety.md` enforces this in the system prompt and the voice selection.
- Use league logos, club crests, or broadcaster logos in marketing without permission.

## Third-party processors

| Provider | Role | Data shared |
|---|---|---|
| Supabase | DB, Auth, Storage, Realtime | All user-scoped data |
| Vercel | App hosting + delivery | Standard request metadata (incl. IP) |
| Anthropic | LLM writer + contradiction judge (Opus / Sonnet) | Match-fact prompt only, no PII |
| ElevenLabs | TTS synthesis | The match-fact script only, no PII |
| Stripe | Payments + subscription billing | Email + payment details (card data stays with Stripe) |
| Google Fonts | Font delivery | Standard browser request (IP) |
| PostHog (US cloud) | Product analytics | Page views + the live custom events in `09-growth.md` |

We publish this list on `/legal/privacy`. Updates require updating both this doc and the public page in the same change.

## If a takedown / cease-and-desist arrives

1. Don't reply on the spot. Acknowledge receipt within 48h.
2. Identify the specific episode(s) or asset(s) named.
3. Take down immediately (`06-ops.md` "take down a bad episode"). This is reversible.
4. Loop in counsel before any substantive reply.
5. If the claim concerns AI disclosure or broadcaster impressions specifically: this file plus `05-content-safety.md` is the evidence chain that we deliberately don't do those things.

## Things we will not entertain regardless of legal advice

- Pre-tick consent. Push and analytics are opt-in / objectable.
- Selling user data. Ever. Not aggregated, not anonymised.
- "Powered by AI" rebrand that obscures that it *is* AI. Disclosure stays front-and-centre.
- Charging real money before the subscription terms, refund policy, and Pro features are finalised.

## Changelog of legal-relevant changes

Track in `12-roadmap.md` decision log with the tag `[legal]`.
