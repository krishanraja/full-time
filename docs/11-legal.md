# 11 - Legal and privacy posture

- **Status:** Current operating posture; final launch requires qualified counsel
- **Owner:** Founder and legal
- **Purpose:** Record data, rights, disclosure, billing, processor, and incident requirements.
- **Last reviewed:** 2026-08-10

> This document is an internal operating record, not legal advice.

## Launch rule

Public launch and new billing remain blocked until legal, privacy, consumer, accessibility, data-rights, voice-rights, and research-rights sign-offs are recorded against the exact release revision.

The public pages are:

- `/legal/privacy`
- `/legal/terms`

Any change to collection, retention, processors, billing, rights, or disclosure updates this document and the public pages in the same release.

## Data inventory

| Data                           | Purpose                                | Default retention posture                                               |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------- |
| Email and auth identifiers     | Account and magic-link sign-in         | Until verified deletion request                                         |
| Optional display name          | Profile                                | Until deletion                                                          |
| Pundit preference              | Personalization                        | Local device; synced profile when signed in                             |
| Follows                        | Club and league ordering               | Until deletion                                                          |
| Push endpoint and keys         | Opt-in notification delivery           | Until unsubscribe or deletion                                           |
| Waitlist/launch-note record    | Launch communication and attribution   | Until fulfilled, withdrawn, or deleted                                  |
| Listen and completion events   | Product reliability and usage analysis | Define and publish a bounded retention period before launch             |
| Prediction and receipt records | Public accountability                  | Retained as editorial records; remove personal linkage where applicable |
| Stripe identifiers and status  | Existing billing management            | Legal/accounting period, then deletion or minimization                  |
| PostHog identifiers and events | Product analytics                      | Confirm project region, consent mode, and retention before launch       |
| Support correspondence         | Resolve requests and incidents         | Define category-specific retention before launch                        |

Do not collect card data, contacts, microphone, camera, precise location, or cross-site profiles in the current product.

## Privacy actions before launch

- document controller identity and contact route;
- confirm UK/EU legal bases and consent behavior with counsel;
- configure and record PostHog region, retention, cookie behavior, and opt-out;
- document international transfers and processor agreements;
- publish deletion, access, correction, portability, and objection procedures;
- test account export and deletion end to end;
- define backup and log deletion behavior;
- minimize support and analytics payloads;
- complete accessibility and age/audience review.

## Rights posture

Full Time may use only data, research, voices, and assets covered by a recorded permission, license, or counsel-approved legal basis.

The product:

- uses structured match facts and original prose;
- records provenance and unavailable evidence;
- uses commercially licensed synthetic voices selected through full-length testing;
- preserves source permission, attribution, and expiry in `research_sources`;
- avoids living-pundit style and voice imitation;
- does not use broadcast audio, highlight footage, transcripts, club crests, league marks, or broadcaster marks without permission.

NotebookLM is an internal research workbench. It is not a production writer or a substitute for source rights.

## AI disclosure

The user must be able to understand that:

- scripts are AI-generated from structured match data and licensed research context;
- voices are synthetic;
- automated and human quality controls can still fail;
- predictions are probabilistic, not guarantees;
- no copyrighted broadcast audio is used.

Disclosure appears in Settings and on relevant player or transcript surfaces. It is not removable through experimentation.

## Billing and consumer terms

New checkout is disabled. Existing subscriber management remains available.

Before any paid offer:

- approve the exact product, included features, price, currency, renewal cadence, and taxes;
- publish subscription, cancellation, refund, and cooling-off terms;
- verify clear pre-contract information and affirmative consent;
- confirm accessible checkout and support routes;
- verify live Stripe configuration and webhooks against the release revision;
- define complaint, cancellation, failed-payment, and refund runbooks;
- separate product launch approval from billing approval.

Do not charge for roadmap items or imply that a disabled paid surface is currently available.

## Processors

Current or retained integrations include:

| Provider     | Role                                                     | Data category                                                                     |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Supabase     | Database, auth, storage, realtime                        | Account, preference, editorial, operational, media data                           |
| Vercel       | Hosting, functions, workflow, delivery                   | Request metadata and server workloads                                             |
| Anthropic    | Script and judge generation                              | Match evidence, research concepts, persona instructions; no account PII by design |
| ElevenLabs   | TTS and transcription services                           | Approved script and pronunciation context; no account PII by design               |
| Stripe       | Existing billing management and future reviewed checkout | Email, customer, subscription, and provider-held payment data                     |
| PostHog      | Product analytics                                        | Pseudonymous usage events and request metadata                                    |
| Google Fonts | Font delivery                                            | Browser request metadata unless self-hosted later                                 |

Confirm contracts, regions, retention, subprocessors, and deletion behavior before launch. The public privacy page must match reality.

## Data subject request

1. Record the request without asking for a password or token.
2. Verify identity proportionately.
3. Search auth, profile, follows, listens, push, waitlist, billing identifiers, analytics, and support records.
4. Preserve legally required financial or security records while minimizing linkage.
5. Complete the action within the applicable legal period.
6. Record the operator, scope, timestamps, exceptions, and confirmation.

Never execute deletion from an unverified email alone.

## Takedown or rights complaint

1. Acknowledge receipt without admitting liability.
2. Identify the exact variant, asset, source, voice, mark, or wording challenged.
3. Pause or quarantine the affected material when continued exposure creates risk.
4. Preserve evidence, permissions, provenance, model versions, and audit records.
5. Notify founder and counsel before a substantive response.
6. Correct the product and source records; do not silently replace history.

## Non-negotiable refusals

Full Time will not sell user data, hide synthetic-media disclosure, imitate a living pundit, remove a wrong receipt for reputation management, use unlicensed footage or transcripts, accept sponsor control of editorial conclusions, or activate billing before consumer terms are approved.
