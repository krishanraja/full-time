# Full Time documentation

This handbook is the operating contract for Full Time. It serves founders, product and engineering agents, operators, reviewers, support, marketers, sellers, and partners who need current answers without guessing from the codebase.

- **Status:** Current documentation index
- **Owner:** Founder and product
- **Purpose:** Route every reader and autonomous agent to the right source of truth.
- **Last reviewed:** 2026-08-11
- **Production authority:** GitHub `main` plus observed behavior on the current Vercel production deployment

## Source-of-truth order

When two records conflict, use this order:

1. Code, migrations, tests, and live readback for implemented or deployed facts.
2. [`product-state.json`](./product-state.json) for the machine-readable product, commercial state, known gaps, claim boundaries, and source paths.
3. [`00-product.md`](./00-product.md) for product doctrine and intended experience.
4. [`18-world-class-pundit-system.md`](./18-world-class-pundit-system.md) for the current implementation map.
5. [`19-release-state.md`](./19-release-state.md) for what is live, disabled, blocked, or awaiting evidence.
6. The role-specific current guide below.
7. Historical and proposed records, which never direct current work.

Never convert a roadmap decision into a live claim. Never convert an implemented control into proof that the product is reliable, loved, licensed, or ready to sell.

## Read by task

| Need                          | Read first                                               | Then                                                                                   |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Explain the product           | [`product-state.json`](./product-state.json)             | [`00-product.md`](./00-product.md), [`01-brand.md`](./01-brand.md)                     |
| Change the product            | [`00-product.md`](./00-product.md)                       | [`02-developer.md`](./02-developer.md), owning code and tests                          |
| Market the preview            | [`21-go-to-market-agent.md`](./21-go-to-market-agent.md) | [`07-marketing.md`](./07-marketing.md), [`01-brand.md`](./01-brand.md)                 |
| Sell or discuss a partnership | [`21-go-to-market-agent.md`](./21-go-to-market-agent.md) | [`08-sales.md`](./08-sales.md), [`11-legal.md`](./11-legal.md)                         |
| Answer a user                 | [`10-support.md`](./10-support.md)                       | owning product or legal guide                                                          |
| Operate or release            | [`19-release-state.md`](./19-release-state.md)           | [`06-ops.md`](./06-ops.md)                                                             |
| Review evidence or safety     | [`05-content-safety.md`](./05-content-safety.md)         | [`03-architecture.md`](./03-architecture.md), [`04-data-model.md`](./04-data-model.md) |
| Join the project as an agent  | [`13-agent-handoff.md`](./13-agent-handoff.md)           | role-specific guide                                                                    |

## Document catalog

| File                                                                   | Status                           | Owner and use                                                                          |
| ---------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| [`product-state.json`](./product-state.json)                           | Current, machine-readable        | Product facts, shipped behavior, known gaps, offer state, claims, and evidence paths   |
| [`00-product.md`](./00-product.md)                                     | Current                          | Product promise, user experience, doctrine, scope, and launch standard                 |
| [`01-brand.md`](./01-brand.md)                                         | Current                          | Playful AI-native voice, visual system, generated avatars, terminology, and copy rules |
| [`02-developer.md`](./02-developer.md)                                 | Current                          | Setup, repository map, invariants, tests, and safe change patterns                     |
| [`03-architecture.md`](./03-architecture.md)                           | Current                          | System topology, Today response, trust boundaries, workflows, and failure behavior     |
| [`04-data-model.md`](./04-data-model.md)                               | Current                          | Schema, ownership, RLS, immutability, and migration map                                |
| [`05-content-safety.md`](./05-content-safety.md)                       | Current and binding              | Evidence licensing, proof cards, humour safety, disclosure, and incidents              |
| [`06-ops.md`](./06-ops.md)                                             | Current runbook                  | Schedules, rehearsals, publication, deployment, incidents, and rollback                |
| [`07-marketing.md`](./07-marketing.md)                                 | Current pre-launch playbook      | Audience, positioning, channel rules, proof, copy, and launch discipline               |
| [`08-sales.md`](./08-sales.md)                                         | Current commercial posture       | What can be offered, qualified, promised, declined, or escalated                       |
| [`09-growth.md`](./09-growth.md)                                       | Current                          | Product metrics, events, loops, and experiment policy                                  |
| [`10-support.md`](./10-support.md)                                     | Current                          | Approved answers, diagnosis, current gaps, and escalation                              |
| [`11-legal.md`](./11-legal.md)                                         | Current posture, counsel pending | Privacy, rights, disclosure, processors, billing, and takedown rules                   |
| [`12-roadmap.md`](./12-roadmap.md)                                     | Current                          | Remaining work, implementation gaps, deferrals, and decisions                          |
| [`13-agent-handoff.md`](./13-agent-handoff.md)                         | Current                          | Fast orientation and safe handoff for engineering and commercial agents                |
| [`14-build-plan.md`](./14-build-plan.md)                               | Historical                       | Original single-voice prototype and what replaced it                                   |
| [`15-access-and-waitlist-plan.md`](./15-access-and-waitlist-plan.md)   | Historical                       | Previous access and billing experiments                                                |
| [`16-ask-your-pundit.md`](./16-ask-your-pundit.md)                     | Proposal                         | Evidence-bounded interactive Q&A discovery spec                                        |
| [`18-world-class-pundit-system.md`](./18-world-class-pundit-system.md) | Current                          | Implemented AI Pundit system and release controls                                      |
| [`19-release-state.md`](./19-release-state.md)                         | Current                          | Live source, enabled state, gaps, blockers, and next operator sequence                 |
| [`20-research-intake.md`](./20-research-intake.md)                     | Current                          | Private source intake, rights attestation, and corpus procedure                        |
| [`21-go-to-market-agent.md`](./21-go-to-market-agent.md)               | Current and binding              | Autonomous marketing and sales briefing, proof map, objections, and action limits      |

Number 17 remains intentionally unused.

## Shared vocabulary

| Term               | Meaning                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| AI Pundit          | The user-facing name for one of the six AI-made football perspectives                                   |
| Coverage date      | The London calendar date represented by a daily drop                                                    |
| Daily drop         | One coverage date, shared evidence, and up to six AI Pundit variants                                    |
| Variant or edition | One AI Pundit's thesis, script, performance, audio, assets, and status                                  |
| Proof card         | A public plain-English claim, supporting sealed facts, and an evidence boundary                         |
| Evidence pack      | Immutable facts, derivations, provenance, and unavailable evidence for one match                        |
| Hard gate          | A binary rule whose failure blocks publication                                                          |
| Harness            | An internal independent review of one qualitative dimension; never primary public copy                  |
| Settled record     | A completed AI Pundit claim showing what was said, what happened, and what was missed                   |
| Pre-launch         | The preview is visible while automated publication, billing, and public launch remain disabled          |
| Launch-ready       | Every revision-bound editorial, audio, operational, rights, legal, accessibility, and human gate passes |

## Documentation rules

Every current Markdown guide must state status, owner, purpose, and a review date. Current claims must link to code, a migration, a live readback, or `product-state.json`. Public terminology uses **AI Pundit**, while technical identifiers stay unchanged when compatibility requires it.

Run:

```powershell
pnpm run docs:check
```

The check validates the product-state schema, current-document metadata, navigation contract, `/feed` redirect, core terminology, and index coverage. It supplements review; it does not prove deployment parity or commercial readiness.

## Maintaining the handbook

1. Change behavior and its owning document together.
2. Update `product-state.json` when shipped behavior, a known gap, offer state, or claim boundary changes.
3. Update [`19-release-state.md`](./19-release-state.md) only when live state or release evidence changes.
4. Add a dated record to [`12-roadmap.md`](./12-roadmap.md) when doctrine changes.
5. Update [`21-go-to-market-agent.md`](./21-go-to-market-agent.md) when an offer, audience, proof, objection, or autonomy boundary changes.
6. Run documentation and repository checks before merging.
