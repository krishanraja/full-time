# Route map

- **Status:** Current
- **Owner:** Engineering
- **Purpose:** Explain TanStack Start file routing and identify the exact public, compatibility, crawler, and operator surfaces.
- **Last reviewed:** 2026-09-27

TanStack Start generates routes from files in this directory. Do not create `src/pages`, `app`, or a second root layout. [`__root.tsx`](./__root.tsx) owns the document shell, the no-scroll frame, Today/Teams/Settings navigation, providers, shared player, and error boundaries. Never edit generated `routeTree.gen.ts`.

## File naming

| File pattern       | URL shape                         |
| ------------------ | --------------------------------- |
| `index.tsx`        | `/`                               |
| `episode.$id.tsx`  | `/episode/:id`                    |
| `feed[.]rss.ts`    | `/feed.rss`                       |
| `llms[.]txt.ts`    | `/llms.txt`                       |
| `sitemap[.]xml.ts` | `/sitemap.xml`                    |
| `files/$.tsx`      | `/files/*`, read from `_splat`    |
| `_layout.tsx`      | Pathless layout with `<Outlet />` |
| `__root.tsx`       | Global document and shell         |

Use a bare `$` for a dynamic segment. Square brackets escape a literal character.

## Public navigation

Only three destinations appear in the app shell:

| Label    | URL          | File            | Current purpose                                                                                                                                                            |
| -------- | ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today    | `/`          | `index.tsx`     | One Premier League match at a time: competition and date with earlier and later chevrons, crests and score, the six AI Pundits as a rail, the player, and proof in a sheet |
| Teams    | `/following` | `following.tsx` | The twenty clubs of the current Premier League season, with crests, to follow                                                                                              |
| Settings | `/settings`  | `settings.tsx`  | One card of rows: AI Pundit (picker drawer), account, morning recap, and billing for existing Pro subscribers only, with the AI disclosure beneath it                      |

The route remains `/following` to preserve stored links and compatibility. The user-facing label is Teams.

The app is a completely no-scroll experience (Ruling, Krish, 2026-09-27). The document never scrolls: `__root.tsx` holds the header, the screen region (`#screen`), the mini player, and the tab bar in normal flow inside the `app-frame` utility (100dvh, with a 100vh fallback, in `src/styles.css`). `#screen` scrolls only as a last resort, for legal text or zoom. The mini player appears off Today once a show has been started and names the match. Legacy direct-URL routes (`/receipts`, `/archive`, `/episode/:id`, `/pro`, `/waitlist`, and the legal pages) were not re-laid-out and scroll inside the screen region.

## Other product routes

| URL              | File                | Current state                                                                                    |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `/feed`          | `feed.tsx`          | Redirects to Today; no standalone Feed page                                                      |
| `/receipts`      | `receipts.tsx`      | Unlisted legacy searchable prediction ledger with no in-app entry; settled-only replacement pending |
| `/episode/:id`   | `episode.$id.tsx`   | Legacy shareable episode and transcript page                                                     |
| `/archive`       | `archive.tsx`       | Signed-in labelled archive/demo browser; on-demand narration off unless `ENABLE_LEGACY_DAILY_DROP=true`, and the server reports availability |
| `/auth`          | `auth.tsx`          | Optional magic-link authentication                                                               |
| `/waitlist`      | `waitlist.tsx`      | Launch-note registration                                                                         |
| `/pro`           | `pro.tsx`           | Existing subscriber management; no new checkout during the live beta                             |
| `/legal/privacy` | `legal.privacy.tsx` | Public privacy notice                                                                            |
| `/legal/terms`   | `legal.terms.tsx`   | Public terms notice                                                                              |

## Crawler and distribution routes

| URL                    | File                       | Current state                                                           |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------- |
| `/api/public/feed.rss` | `api/public/feed[.]rss.ts` | Canonical Reporter RSS feed                                             |
| `/llms.txt`            | `llms[.]txt.ts`            | Machine-facing AI-native product orientation and recent legacy episodes |
| `/sitemap.xml`         | `sitemap[.]xml.ts`         | Public indexable routes and published legacy episode pages              |
| `/robots.txt`          | `public/robots.txt`        | Crawler rules and sitemap pointer                                       |

## Public AI Pundit API

| Method and URL                                          | File                                       | Response job                                                |
| ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `GET /api/public/pundits`                               | `api/public/pundits.ts`                    | Six versioned AI Pundit specs with public fields            |
| `GET /api/public/drops/today?pundit=<id>[&drop=<uuid>]` | `api/public/drops.today.ts`                | Current variant, or `latest`: the newest Premier League match's edition (or the `drop` parameter's match), by the requested AI Pundit, else the canonical one, else the first that published; match/team IDs, fixture with crests, proof cards, and `matches` (Premier League matches with a published show, newest first, at most eight, each with who published). `recent` is removed |
| `GET /api/public/drops/:id/variants/:pundit`            | `api/public/drops.$id.variants.$pundit.ts` | Shareable published variant with the same proof projection  |
| `GET /api/public/pundits/:id/predictions`               | `api/public/pundits.$id.predictions.ts`    | Compatibility prediction list; scores hidden unless enabled |
| `GET /api/public/pundits/:id/receipts`                  | `api/public/pundits.$id.receipts.ts`       | Settled, judgeable records only                             |
| `PUT /api/profile/pundit`                               | `api/profile/pundit.ts`                    | Anonymous cookie or authenticated profile preference        |
| `POST /api/stripe/webhook`                              | `api/stripe/webhook.ts`                    | Existing billing state synchronization                      |

Unknown AI Pundit IDs and malformed drop IDs return `400`. On the Today endpoint, a malformed or unshowable `drop` is ignored and Today opens on the newest Premier League match. Missing published variants return `404`. Current-drop service failures return `503` rather than fabricated content.

## Protected operator API

| Endpoint                             | Purpose                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `/api/public/cron/ingest`            | Scheduled Premier League ingest and settlement                                         |
| `/api/public/cron/daily-drop`        | Disabled legacy recovery generator                                                     |
| `/api/internal/daily-rehearsal`      | Durable six-variant workflow                                                           |
| `/api/internal/preflight`            | Free check of everything a paid run needs before it starts                             |
| `/api/internal/judge-calibration`    | Score scripts of known quality against the live judges, to check the publication bar   |
| `/api/internal/publish-drop`         | Publish a drop that passed but whose run did not carry it over the line                |
| `/api/internal/rehearsal`            | Rehearsal inspection and control                                                       |
| `/api/internal/produce-variant`      | Narration, mastering and share card for one AI Pundit edition (called by the workflow) |
| `/api/internal/predictions-register` | Pre-kickoff registration                                                               |
| `/api/internal/forecast-train`       | Held-out forecast training                                                             |
| `/api/internal/evaluation-corpus`    | Evaluation-set construction                                                            |
| `/api/internal/evaluation-run`       | Resumable 360-script evaluation                                                        |
| `/api/internal/release-readiness`    | Revision-bound release-gate report                                                     |

Internal and cron handlers use the shared timing-safe bearer validator and a feature-specific fail-closed flag.

## Known route gaps

- `/receipts` still calls the broader predictions endpoint and renders search, filters, open-state logic, and technical score cards. Today no longer links to it (removed 2026-09-27), so it has no in-app entry.
- Legacy direct-URL routes (`/receipts`, `/archive`, `/episode/:id`, `/pro`, `/waitlist`, and the legal pages) were not re-laid-out for the no-scroll frame and scroll inside the screen region.
- Several legacy archive, episode, waitlist, and legal copy surfaces predate the final AI Pundit language pass.

Record a gap in `docs/product-state.json` until code and live readback close it.

## Route checklist

For a new or changed page:

- keep Today, Teams, Settings as the only shell navigation unless doctrine changes;
- use AI Pundit in user-facing copy;
- add accurate title, description, canonical, and social metadata;
- provide loading, empty, unavailable, error, and recovery states;
- preserve keyboard access, focus restoration, 44-pixel targets, pinch zoom, safe areas, reduced motion, contrast, and natural text wrapping;
- keep privileged data in server code;
- update this map, `docs/product-state.json`, and the owning guide.

For a new or changed endpoint:

- validate method, path, query, and body;
- authenticate before privileged reads or writes;
- return the smallest public projection;
- make retried writes idempotent;
- return an explicit non-2xx response for disabled, missing, or quarantined work;
- add a focused test and documentation update.
