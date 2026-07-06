# Full Time, Documentation

This folder is the source of truth for every role that touches Full Time.

Each file declares the role it is written for, when to read it, and when not to. If you are an AI agent operating on this codebase, **find your role first** and read that file before touching anything else.

## Index

| # | File | Role | Read when |
|---|---|---|---|
| 00 | [product.md](./00-product.md) | Product | Defining what we build and why |
| 01 | [brand.md](./01-brand.md) | Brand / design | Touching anything visual, copy, or naming |
| 02 | [developer.md](./02-developer.md) | Developer | Writing or refactoring code |
| 03 | [architecture.md](./03-architecture.md) | Developer / Ops | Understanding how the pieces talk |
| 04 | [data-model.md](./04-data-model.md) | Developer / Data | Reading or writing the database |
| 05 | [content-safety.md](./05-content-safety.md) | Developer / Legal / Product | Touching the AI pipeline |
| 06 | [ops.md](./06-ops.md) | Ops / On-call | Something is broken or needs rotating |
| 07 | [marketing.md](./07-marketing.md) | Marketing | Channels, launches, messaging |
| 08 | [sales.md](./08-sales.md) | Sales / BD | Monetization, partnerships, rights conversations |
| 09 | [growth.md](./09-growth.md) | Growth | Acquisition, retention, referrals |
| 10 | [support.md](./10-support.md) | Support | Answering users, FAQ source-of-truth |
| 11 | [legal.md](./11-legal.md) | Legal | Data, IP, AI disclosure stance |
| 12 | [roadmap.md](./12-roadmap.md) | Product | What's next, decision log |
| 13 | [agent-handoff.md](./13-agent-handoff.md) | Any AI agent | Picking up this project cold |

## Authoring rules

- Every doc opens with **Role**, **When to read this**, **When NOT to read this**.
- Reference source files with concrete paths (e.g. `src/lib/api/episode-pipeline.functions.ts`).
- Cross-link rather than duplicate. Brand tokens live once in `01-brand.md`; tables live once in `04-data-model.md`.
- Decisions follow the format **Decision · Context · Tradeoff · Reversible?**.
- No marketing copy in dev docs. No implementation detail in sales / marketing docs.
- Keep docs current. If you change behaviour, update the doc in the same change.

## Conventions

- Dates are ISO (`YYYY-MM-DD`).
- Money is EUR unless stated.
- "Big 5" means England (Premier League), Spain (La Liga), Italy (Serie A), Germany (Bundesliga), France (Ligue 1).
- "Drop" = the daily batch of recaps published at 07:00 local.
