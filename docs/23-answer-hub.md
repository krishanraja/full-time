# 23 - Answer hub

- **Status:** Current
- **Owner:** Founder and product
- **Purpose:** Define the answer hub at `/answers`: what it is for, its quality bar, where questions come from, the weekly cadence, and how to add a post.
- **Last reviewed:** 2026-10-21

## What it is

The answer hub is a small set of pages that answer, directly and checkably, the questions fans and answer engines ask about Full Time: what it is, who the six AI Pundits are, how the facts are checked, what match data can and cannot prove, what it costs and which league it covers. It exists so that when someone asks a search or AI assistant about Full Time, there is a citable page that says the true thing first.

It moves the North Star's reach: fans who have not heard of Full Time can only start their morning with it if they can find it.

It is not the "SEO content farm" that [`00-product.md`](./00-product.md) rules out. The hub only answers questions about Full Time itself, from this repository's own record, and grows slowly.

## How it is served

- **Same page for everyone.** Every visitor, human or crawler, gets the same server-rendered HTML. Nothing reads the user agent, nothing is hidden with CSS, and nothing is shown only to bots. A test fails if the hub's code mentions the user agent.
- **Reachable, not in the app's navigation.** The hub is not linked from the tab bar, header or footer (a test enforces this), because the app is a one-screen player (Ruling, Krish, 2026-09-27). It is public at `/answers` and `/answers/<slug>`, listed in `/sitemap.xml`, `/llms.txt` and `/llms-full.txt`, published as an Atom feed at `/answers/feed.xml` (advertised in every page's head), and each post links to related posts.
- **Structured data.** Each post carries `Article`, `FAQPage` and `BreadcrumbList` JSON-LD with honest `datePublished` and `dateModified`, an absolute canonical, and the site Organization as author and publisher. The index carries `CollectionPage` with an `ItemList`.

| Path | File |
| --- | --- |
| `/answers` | `src/routes/answers.index.tsx` |
| `/answers/<slug>` | `src/routes/answers.$slug.tsx` |
| `/answers/feed.xml` | `src/routes/answers.feed[.]xml.ts` |
| `/llms-full.txt` | `src/routes/llms-full[.]txt.ts` |
| Posts | `src/content/answers/posts/<slug>.ts` |
| Question backlog | `src/content/answers/backlog.json` |
| Builders and validator | `src/lib/answers.ts`, `src/lib/answers.test.ts` |

## Quality bar

A post ships only when all of these hold. The first group is enforced by `src/lib/answers.test.ts` on every `pnpm test`; the second is the writer's job.

Enforced:

- the question ends with a question mark, and the slug is lowercase words joined by hyphens, unique, and equal to the file name;
- the direct answer is 40 to 60 words and is the first thing on the page;
- the description is 70 to 160 characters;
- at least two sections of depth, at least two FAQ entries, at least one source, at least one related post, and every related or internal link resolves;
- dates are real `YYYY-MM-DD` values, not in the future, and `dateModified` is never earlier than `datePublished`;
- British spelling (a short list of American spellings fails the test);
- every post appears in the sitemap, the Atom feed, `llms.txt` and `llms-full.txt`.

Writer's job:

- every claim comes from a current source in this repository, in the authority order of [`README.md`](./README.md): code and live readback, then `product-state.json`, then the owning guide. No invented numbers, dates, prices, leagues, audience figures or promises;
- the claim boundaries of [`21-go-to-market-agent.md`](./21-go-to-market-agent.md) and [`10-support.md`](./10-support.md) apply: no public launch date as a promise, no betting framing, no other leagues, no claim that waived gates passed, no promise of perfect accuracy;
- the voice of [`01-brand.md`](./01-brand.md): short, concrete, warm, AI Pundit everywhere;
- nothing internal: no secret or environment variable name, no database identifier, no vendor or data-provider name, no private evidence-intake detail.

## Where questions come from

Candidates live in `src/content/answers/backlog.json`, each with the question, why it matters, and the repository sources an answer may use. Good sources of new questions:

- what testers ask at krish@fulltime.fm and what [`10-support.md`](./10-support.md) already answers;
- the product's own known gaps and boundaries in `product-state.json`, phrased as the question a fan would ask;
- questions an answer engine gets wrong about Full Time when asked directly.

A question with no repository source for its answer stays in the backlog until one exists.

## Cadence

`.github/workflows/answers-weekly.yml` runs every Monday at 07:13 UTC (and on demand). It opens one issue, "Answer hub brief: week of <Monday>", with the checklist and the next three open questions, and does nothing if that week's issue already exists. It runs plain Node over committed files: no model call, no API credit, no deploy. Model spend per run: $0.

The weekly target is at most one or two posts, and none when nothing is worth answering. Each brief also asks for a pass over existing posts, because a post that has drifted from the product is worse than no post.

## How to add a post

1. Pick an open question from the backlog, or add one with its sources.
2. Copy an existing file in `src/content/answers/posts/` to `<slug>.ts` and rewrite every field. The direct answer goes first, in 40 to 60 words.
3. Set `datePublished` and `dateModified` to today. For a later substantive edit, change only `dateModified`.
4. Mark the backlog entry `published` with its `slug`.
5. Run `pnpm test`, `pnpm run typecheck`, `pnpm run lint` and `pnpm run build`. Nothing else needs editing: the index, sitemap, feed and llms files pick the post up from the folder.
6. After deploy, read back the post, `/sitemap.xml`, `/answers/feed.xml` and `/llms.txt` on production.

To retire a post, delete its file and mark its backlog entry `dropped` with a reason; remove any `related` links to it (the test will name them).
