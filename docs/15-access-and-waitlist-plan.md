# 15 - Access and waitlist history

- **Status:** Historical decision record
- **Original period:** 2026-07-06 to 2026-08-08
- **Last reviewed for provenance:** 2026-08-11
- **Purpose:** Explain earlier access experiments and the current replacement.

## Current access model

During pre-launch:

| Capability                                 | Anonymous                             | Signed in            | Existing subscriber |
| ------------------------------------------ | ------------------------------------- | -------------------- | ------------------- |
| Choose any of six AI Pundits               | Yes                                   | Yes                  | Yes                 |
| Save preference locally                    | Yes                                   | Yes                  | Yes                 |
| Sync supported profile settings            | No                                    | Yes                  | Yes                 |
| View approved current and archive surfaces | Yes                                   | Yes                  | Yes                 |
| Join launch note                           | Yes, through auth flow where required | Yes                  | Yes                 |
| Start a new paid subscription              | No                                    | No                   | No                  |
| Manage an existing subscription            | No                                    | No unless subscribed | Yes                 |

All six AI Pundits are free because private verification needs broad product feedback. Billing and the paid value proposition are separate post-readiness decisions.

## Historical sequence

### July 2026: anonymous, free account, waitlist

The first access ladder used the product without login, then offered account sync, archive, on-demand generation, and a waitlist as deeper steps. It treated waitlist demand as a potential trigger for daily ingest.

### July 2026: temporary Pro experiment

An interim change moved four pundits and a larger on-demand allowance behind a $4.99 monthly tier. Stripe plumbing, entitlement checks, and a database billing guard were implemented.

### August 2026: quality-first pre-launch

The six-pundit product replaced presentation-only personas. All pundits became free, new checkout and paid claims were disabled, daily publication moved behind release evidence, and the waitlist became a launch-note list rather than an automatic launch trigger.

## What remains useful

- Anonymous listening is the default.
- Sign-in should add persistence, not unlock the basic product promise.
- Shared links do not overwrite a recipient's saved pundit.
- Billing columns remain protected from user writes.
- Existing subscribers retain a cancellation and management path.
- Launch communication must not imply a date that quality gates have not earned.

## What is superseded

- Free versus Pro pundit gates.
- A fixed waitlist count as an automatic launch trigger.
- A promised daily product before seven complete rehearsals.
- `name a game` as the main paid-value proof.
- Any claim that checkout is currently live for new subscribers.

Current access behavior is defined in `src/lib/launch-config.ts`, `src/lib/entitlement.ts`, the relevant routes, [`product-state.json`](./product-state.json), and [`19-release-state.md`](./19-release-state.md).
