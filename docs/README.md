# Full Time documentation

This handbook is the operating contract for Full Time. It is written for founders, contributors, agents, operators, reviewers, and commercial partners who need accurate answers without reverse-engineering the codebase.

- **Last reviewed:** 2026-08-10
- **Current production revision:** `36fd607e2ef862894434a3aafd0c7e378f3d5f68`

## Source-of-truth order

When documents conflict, use this order:

1. [`00-product.md`](./00-product.md): what the product is and what it refuses to become.
2. [`18-world-class-pundit-system.md`](./18-world-class-pundit-system.md): what the current code and schema implement.
3. [`19-release-state.md`](./19-release-state.md): what is live, enabled, blocked, or awaiting evidence now.
4. Role-specific current documents in the table below.
5. Historical records, which explain old decisions but never direct current work.

Code, migrations, and deployment evidence decide implementation facts. Documentation should explain those facts, not compete with them.

## Reading map

| File                                                                   | Status                           | Audience                        | Use it for                                                                 |
| ---------------------------------------------------------------------- | -------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| [`00-product.md`](./00-product.md)                                     | Current                          | Everyone                        | Product promise, doctrine, boundaries, launch standard                     |
| [`01-brand.md`](./01-brand.md)                                         | Current                          | Design, product, marketing      | Visual system, brand voice, copy and asset rules                           |
| [`02-developer.md`](./02-developer.md)                                 | Current                          | Engineers and coding agents     | Setup, repository map, conventions, tests, safe change patterns            |
| [`03-architecture.md`](./03-architecture.md)                           | Current                          | Engineering, data, operations   | System topology, trust boundaries, flows and failure behavior              |
| [`04-data-model.md`](./04-data-model.md)                               | Current                          | Engineering, data, security     | Table groups, ownership, RLS, immutability and migrations                  |
| [`05-content-safety.md`](./05-content-safety.md)                       | Current                          | Editorial, engineering, legal   | Evidence licensing, humour safety, quality gates and incidents             |
| [`06-ops.md`](./06-ops.md)                                             | Current                          | Operators and on-call           | Schedules, rehearsals, publishing, incidents, rollback and secrets         |
| [`07-marketing.md`](./07-marketing.md)                                 | Current                          | Marketing and launch            | Positioning, audiences, channels, approved copy and launch discipline      |
| [`08-sales.md`](./08-sales.md)                                         | Current                          | Sales, BD, partnerships         | Commercial posture, rights conversations, sponsor rules and future pricing |
| [`09-growth.md`](./09-growth.md)                                       | Current                          | Product and growth              | Metrics, event taxonomy, loops and experiment policy                       |
| [`10-support.md`](./10-support.md)                                     | Current                          | Support                         | Approved user answers, diagnosis and escalation                            |
| [`11-legal.md`](./11-legal.md)                                         | Current posture, counsel pending | Legal, product, operations      | Privacy, processors, rights, billing preconditions and takedowns           |
| [`12-roadmap.md`](./12-roadmap.md)                                     | Current                          | Founder and product             | Remaining work, launch sequence, backlog and decision log                  |
| [`13-agent-handoff.md`](./13-agent-handoff.md)                         | Current                          | New agents and contributors     | Fast orientation, invariants, verification and handoff format              |
| [`14-build-plan.md`](./14-build-plan.md)                               | Historical                       | Product historians              | Original June 2026 plan and what replaced it                               |
| [`15-access-and-waitlist-plan.md`](./15-access-and-waitlist-plan.md)   | Historical                       | Product historians              | Old access experiments and the current replacement                         |
| [`16-ask-your-pundit.md`](./16-ask-your-pundit.md)                     | Proposal                         | Product and engineering         | Evidence-bounded interactive Q&A discovery spec                            |
| [`18-world-class-pundit-system.md`](./18-world-class-pundit-system.md) | Current                          | Product, engineering, reviewers | Implemented six-pundit system and release-control map                      |
| [`19-release-state.md`](./19-release-state.md)                         | Current                          | Founder and operators           | Live revision, enabled state, blockers and next operator sequence          |

Number 17 is intentionally unused. Do not create a placeholder merely to fill the sequence.

## Documentation standard

Every current document must:

- state its status, owner, purpose, and last review date;
- lead with the answer a reader needs most;
- link to canonical code or migrations instead of copying volatile implementation detail;
- distinguish implemented, deployed, enabled, verified, and approved;
- label assumptions, proposals, and external human gates;
- use ISO dates and exact route, table, flag, and file names;
- contain no secrets, personal access tokens, live credential values, or copied provider output;
- avoid stale status banners pasted above contradictory prose;
- update in the same change as the behavior it describes.

Historical files start with a warning and contain no executable current instructions. Proposed files state the evidence needed before implementation.

## Shared vocabulary

| Term          | Meaning                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Coverage date | The London calendar date represented by a daily drop                                                      |
| Daily drop    | One coverage date plus its six pundit variants and shared evidence                                        |
| Variant       | One pundit's thesis, script, performance, audio, assets, and status                                       |
| Evidence pack | Immutable facts, derivations, provenance, and unavailable evidence for one match                          |
| Hard gate     | A binary rule whose failure blocks publication                                                            |
| Harness       | An independent scored review of one qualitative dimension                                                 |
| Receipt       | The immutable settlement of a registered prediction                                                       |
| Pre-launch    | Product is visible, while automated publication, billing, and public launch remain disabled               |
| Launch-ready  | Every revision-bound editorial, audio, forecast, operational, legal, accessibility, and human gate passes |

## Maintaining the handbook

1. Update the owning document with the code change.
2. Update [`19-release-state.md`](./19-release-state.md) only when live state or launch evidence changes.
3. Add a dated decision to [`12-roadmap.md`](./12-roadmap.md) when product doctrine changes.
4. Run the documentation checks described in [`02-developer.md`](./02-developer.md).
5. Review links and current-state claims before merging.
