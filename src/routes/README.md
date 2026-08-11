# Route map

- **Status:** Current
- **Purpose:** Explain TanStack Start file routing and identify the public and internal HTTP surface.
- **Last reviewed:** 2026-08-10

TanStack Start generates routes from files in this directory. Do not create `src/pages`, `app`, or a second root layout. [`__root.tsx`](./__root.tsx) is the only application shell, and `routeTree.gen.ts` is generated code.

## File naming

| File pattern             | URL shape                                                |
| ------------------------ | -------------------------------------------------------- |
| `index.tsx`              | `/`                                                      |
| `archive.tsx`            | `/archive`                                               |
| `episode.$id.tsx`        | `/episode/:id`                                           |
| `legal.privacy.tsx`      | `/legal/privacy`                                         |
| `feed[.]rss.ts`          | `/feed.rss`                                              |
| `posts/{-$category}.tsx` | `/posts/:category?`                                      |
| `files/$.tsx`            | `/files/*`, read from `_splat`                           |
| `_layout.tsx`            | Pathless layout that renders `<Outlet />`                |
| `__root.tsx`             | Global document, providers, navigation, and `<Outlet />` |

Use a bare `$` for a dynamic segment. Square brackets escape a literal character in the filename.

## Product routes

| URL              | File                | Purpose                                                    |
| ---------------- | ------------------- | ---------------------------------------------------------- |
| `/`              | `index.tsx`         | Current daily-show surface                                 |
| `/feed`          | `feed.tsx`          | Episode feed                                               |
| `/receipts`      | `receipts.tsx`      | Searchable pundit prediction ledger                        |
| `/episode/:id`   | `episode.$id.tsx`   | Shareable episode page                                     |
| `/archive`       | `archive.tsx`       | Labelled archive and demo coverage                         |
| `/following`     | `following.tsx`     | Followed clubs and leagues                                 |
| `/settings`      | `settings.tsx`      | Preferences, account, disclosure, billing management       |
| `/auth`          | `auth.tsx`          | Magic-link authentication                                  |
| `/waitlist`      | `waitlist.tsx`      | Launch-note registration                                   |
| `/pro`           | `pro.tsx`           | Disabled-new-billing state and existing billing management |
| `/legal/privacy` | `legal.privacy.tsx` | Privacy policy                                             |
| `/legal/terms`   | `legal.terms.tsx`   | Terms of service                                           |

## Public API

| Method and URL                               | File                                       |
| -------------------------------------------- | ------------------------------------------ |
| `GET /api/public/pundits`                    | `api/public/pundits.ts`                    |
| `GET /api/public/drops/today?pundit=<id>`    | `api/public/drops.today.ts`                |
| `GET /api/public/drops/:id/variants/:pundit` | `api/public/drops.$id.variants.$pundit.ts` |
| `GET /api/public/pundits/:id/predictions`    | `api/public/pundits.$id.predictions.ts`    |
| `GET /api/public/pundits/:id/receipts`       | `api/public/pundits.$id.receipts.ts`       |
| `GET /api/public/feed.rss`                   | `api/public/feed[.]rss.ts`                 |
| `PUT /api/profile/pundit`                    | `api/profile/pundit.ts`                    |
| `POST /api/stripe/webhook`                   | `api/stripe/webhook.ts`                    |

## Protected operational API

| Endpoint                             | Purpose                                         |
| ------------------------------------ | ----------------------------------------------- |
| `/api/public/cron/ingest`            | Scheduled structured-data ingest and settlement |
| `/api/public/cron/daily-drop`        | Disabled legacy recovery generator              |
| `/api/internal/daily-rehearsal`      | Durable six-variant run                         |
| `/api/internal/rehearsal`            | Rehearsal inspection/control surface            |
| `/api/internal/predictions-register` | Pre-kickoff registration                        |
| `/api/internal/forecast-train`       | Held-out forecast training                      |
| `/api/internal/evaluation-corpus`    | Evaluation-set construction                     |
| `/api/internal/evaluation-run`       | Resumable 360-script evaluation                 |
| `/api/internal/release-readiness`    | Revision-bound launch-gate report               |

Internal and cron handlers must call the shared timing-safe bearer validator and fail when `CRON_SECRET` is missing. Feature-specific server flags provide a second denial layer.

## Route checklist

For a new page:

- add title, description, canonical URL, and social metadata through the route `head` contract;
- keep auth-gated data in server functions or client queries, not public loaders;
- provide loading, empty, unavailable, and error states;
- preserve keyboard navigation, visible focus, pinch zoom, and reduced-motion behavior;
- use semantic tokens from `src/styles.css`.

For a new endpoint:

- declare method and response shape;
- validate path, query, and body data;
- authenticate before privileged reads or writes;
- make retries idempotent where a caller may repeat the request;
- return an explicit non-2xx response for disabled or quarantined work;
- add a focused test and update this map.
