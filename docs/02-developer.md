# 02 · Developer

**Role:** Anyone writing or refactoring code in this repo.
**Read this when:** adding a feature, fixing a bug, refactoring, onboarding.
**Don't read this when:** you only need product context (→ `00-product.md`) or system topology (→ `03-architecture.md`).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19, file-based routing, server functions) |
| Bundler | Vite 8 + Lightning CSS |
| Styling | Tailwind v4 (CSS-first, no `tailwind.config.js`) |
| Components | shadcn/ui + lucide-react |
| Motion | framer-motion |
| State (client) | TanStack Query + a few tiny `useSyncExternalStore` stores (`player-store.ts`, `follow-store.ts`) |
| Backend | Supabase (Postgres + Auth + Storage + Realtime), project `hzadscrqmyilbisexvyz` |
| AI (writer) | Anthropic Opus via `recap-generator.server.ts` (`WRITER_MODEL`, default `claude-opus-4-8`) |
| AI (judge) | Anthropic Sonnet contradiction judge (`JUDGE_MODEL`, default `claude-sonnet-4-6`) |
| TTS | ElevenLabs (`eleven_multilingual_v2`, voice via `ELEVENLABS_VOICE_ID`) |
| Payments | Stripe (test mode today, no real charges): Checkout + Billing Portal + webhooks |
| Push | Web Push (VAPID) via `web-push` in a server function |
| Analytics | Plausible (cookieless, optional via `VITE_PLAUSIBLE_DOMAIN`) |
| Runtime | Vercel serverless functions (Node). Server code runs per request; heavy work (LLM writer + judge + TTS) is bounded by the function timeout, see the cron budget below. |

## File map

```
src/
  routes/                file-based routes (TanStack)
    __root.tsx           app shell, head, fonts, AppHeader, MiniPlayer, BottomNav
    index.tsx            "/" -> Today
    feed.tsx             "/feed"
    following.tsx        "/following"
    settings.tsx         "/settings"
    pro.tsx              "/pro" -> paywall + subscription management (Stripe)
    auth.tsx             "/auth" -> magic link
    legal.privacy.tsx    "/legal/privacy"
    legal.terms.tsx      "/legal/terms"
    api/public/
      cron.daily-drop.ts cron POST endpoint (CRON_SECRET bearer, publishable-key fallback)
    api/stripe/
      webhook.ts         Stripe webhook (raw-body signature verified)
  components/
    AppHeader.tsx        sticky wordmark header (every route)
    Wordmark.tsx         wordmark + mark image components
    AudioCard.tsx        hero + carousel card
    EpisodeListItem.tsx  list row in Feed / Up next
    MiniPlayer.tsx       bottom-fixed playing strip
    ExpandedPlayer.tsx   full-screen player sheet
    BottomNav.tsx        4-tab bottom nav
    FollowButton.tsx     pill toggle
    VoiceSelector.tsx    settings pundit radios (Pro-gated in the UI)
    HapticButton.tsx     button + haptic feedback
    CompletionToast.tsx  fires on play completion
  hooks/
    use-auth.ts          supabase session
    use-episodes.ts      useTodayFeed (TanStack Query + realtime)
    use-entitlement.ts   client hook: is the caller Pro? (wraps getEntitlement)
  lib/
    api/                 server functions (.functions.ts) + .server.ts helpers
      feed.functions.ts
      follows.functions.ts
      listens.functions.ts
      profile.functions.ts            getMyProfile + setVoiceStyle (server-side Pro gate)
      push.functions.ts
      push-fanout.server.ts
      billing.functions.ts            getEntitlement / createCheckout / createPortal / syncCheckout
      episode-pipeline.functions.ts   runEpisodePipeline (plain fn) + generateEpisodeForMatch (server fn)
      recap-generator.server.ts       deterministic fact-pack -> Opus writer -> gate -> Sonnet judge
    entitlement.ts       CLIENT-SAFE plan constants + isProProfile (no server imports)
    stripe.server.ts     lazy server-only Stripe singleton + proPriceId()
    billing-sync.server.ts  applySubscriptionToProfile: Stripe sub -> profile columns (service-role)
    player-store.ts      <audio> + MediaSession + useSyncExternalStore
    follow-store.ts      local follows + DB sync
    push-client.ts       subscribe/unsubscribe to web push
    haptics.ts
  integrations/supabase/  auto-generated client + types, client.server (service-role), auth-middleware -- DO NOT EDIT the generated files
  styles.css             ALL design tokens live here
  assets/                CDN pointers (.asset.json) -- see Brand
supabase/migrations/     SQL migrations, timestamp-prefixed (incl. the billing guard)
public/                  manifest, icons, sw.js
docs/                    YOU ARE HERE
.github/workflows/       daily-drop.yml -- cron trigger
```

## Conventions

### Tailwind v4

- Config lives in `src/styles.css`. **There is no `tailwind.config.js`.**
- Custom utilities use `@utility name { … }`, never `@layer utilities`.
- Never `@import` a URL in `styles.css`. Web fonts load via `<link>` in `__root.tsx`. See `<tailwind4-remote-css-imports>` in the agent's runtime context.
- Bare `border` is `currentColor` in v4. Always name the colour (`border-[var(--pitch-line)]` or the `hairline` utility).

### Routing

- File-based, flat dot-separated. `routeTree.gen.ts` is auto-generated; never hand-edit.
- Every route MUST set `head()` with title, description, og:title, og:url, and a `canonical` link (root sets defaults, leaves override).
- Public endpoints live under `src/routes/api/**`. **Verify the caller inside the handler.** The cron route checks a `CRON_SECRET` bearer (with a publishable-key `apikey` fallback); the Stripe webhook verifies the Stripe signature against the raw body. Neither uses `requireSupabaseAuth`.

### Server functions

- File suffix `*.functions.ts` in `src/lib/api/`. **Never** put these under `src/server/` -- import-protection blocks the whole tree.
- Service-role import (`@/integrations/supabase/client.server`) only inside `.handler()` (or inside a plain server-only function body), never at module scope of a `.functions.ts` file. Same rule for `stripe.server.ts` and `recap-generator.server.ts`: dynamically `await import(...)` them inside the handler.
- `requireSupabaseAuth` middleware needs `attachSupabaseAuth` registered globally (already done in `src/start.ts`). Server functions that touch a user's own data attach it and read under RLS via `context.supabase`; privileged writes use the service-role `supabaseAdmin`.

### A `createServerFn` cannot be called server-to-server

- A `createServerFn(...)` export is an **RPC endpoint**, not a plain function. Invoking it from other server code (a route handler, the cron, another server fn) routes back through the HTTP/RPC path and fails.
- Pattern: put the real logic in a **plain exported `async` function** and call that server-side; wrap it in a thin `createServerFn` only for client callers.
- Canonical example in `episode-pipeline.functions.ts`: `runEpisodePipeline(matchId)` is the plain function. The cron route (`cron.daily-drop.ts`) imports and calls **`runEpisodePipeline`** directly. `generateEpisodeForMatch = createServerFn(...).handler(...)` is a one-line wrapper that exists only so the client / an RPC caller can trigger the same work.

### Styling components

- Never hardcode colours (`text-white`, `bg-[#0a0a0c]`). Use semantic tokens (`text-foreground`, `bg-card`) or the brand tokens (`bg-[var(--lime)]`).
- Eyebrows: use the `eyebrow` utility class. Section titles always use eyebrows in this app, not h2.
- Numerals: add the `text-mono` utility wherever a number reads as data.
- Cards: use the `surface` utility.
- See `01-brand.md` for the full system.

### Data reads

Canonical pattern is **loader prefetch + `useSuspenseQuery` in the component**, but we currently use `useQuery` in some places (e.g. `useTodayFeed`, `useEntitlement`) because the data is also subscribed to via realtime or is auth-gated. Both are acceptable; do not regress to `useEffect + fetch`.

### Mocks vs real data

`src/data/mockEpisodes.ts` still exists for the `Episode` type and as a shape reference. **Frontend reads from the DB now via `useTodayFeed`.** Do not re-introduce mock reads in components.

## The generation engine

The old Lovable AI Gateway + Gemini path (scoreline-only prompt with a banned-words regex) is gone. Episodes are now produced by a deterministic-fact + LLM-writer + machine-judge pipeline whose accuracy is guaranteed by construction, not by a prompt instruction.

### `recap-generator.server.ts` (server-only, the writer core)

`generateRecap(match, events, stats, corpus)` runs the whole loop and returns `{ ok, title, script, magic_sentence, referenced_scorers, attempts, judge }`.

1. **Deterministic fact-pack.** From `match_events` the code itself credits every goal to the correct team, builds a running `goal_log`, a per-team `scorer_summary`, own-goal and penalty tags, red cards, and full-match stats. The winner and final score are computed in code, not asked of the model. This is why a goal can never be credited to the wrong team.
2. **Opus writer.** A single Anthropic call, conditioned on the `voice_corpus` (`style_rule` / `example` rows) plus hard rules (105 to 135 words, one angle, state each fact once, no em dashes, identity-safe). Model id comes from `WRITER_MODEL` (default `claude-opus-4-8`). All calls go directly to `https://api.anthropic.com/v1/messages` with `x-api-key`; there is a 5-try backoff on 429/5xx and a brace-matching JSON extractor.
3. **Deterministic code gate.** Pure-code checks on the returned script: score stated exactly once and correct, goals-consistent, only real scorers named, length band, no repeated scoreline/minute, no "scored every goal" when both teams scored, no em dash, no banned clichés.
4. **Sonnet contradiction judge.** A second Anthropic call (`JUDGE_MODEL`, default `claude-sonnet-4-6`) that flags a contradiction **only** for a wrong winner, wrong final score, or a named goal credited to the wrong team. It ignores phrasing and any goal the recap chose not to mention.
5. **Up to 5 regens.** On failure the loop feeds back the exact mechanical failures and factual contradictions and rewrites. `ok` is true only when the gate **and** the judge both pass.

### `runEpisodePipeline(matchId)` (the orchestrator, `episode-pipeline.functions.ts`)

Plain exported `async` function (see the server-to-server rule above). It:

- imports `supabaseAdmin` and `generateRecap` **inside the function body**;
- is **idempotent** -- returns early if the match already has an episode;
- loads the match, `match_events`, `match_stats`, and active `voice_corpus`, then calls `generateRecap`;
- **fails closed**: if `recap.ok` is false it `throw`s and **no episode row is written**. A missing recap is always preferred over a wrong one;
- only on success synthesizes ElevenLabs TTS, uploads the MP3 to the `episodes` Storage bucket, and inserts the `episodes` row (`status: "published"`, `model` stamped with the writer+gate+judge+TTS chain).

`generateEpisodeForMatch` is the `createServerFn` wrapper around it for client / RPC triggers.

### Cron: `cron.daily-drop.ts`

Runs the morning drop (GitHub Actions or Vercel cron). It authorizes on a `CRON_SECRET` bearer (publishable-key `apikey` fallback for backward compatibility), selects recent finished matches without an episode, and calls `runEpisodePipeline` with **bounded concurrency (3)** under a **240s wall-clock budget** to stay inside the function timeout. Anything not reached is safe to pick up next run because the pipeline is idempotent. New episodes trigger the web-push fan-out (non-fatal if it fails). Inert until a live match-data feed exists.

## Billing and Pro entitlement

Free vs **Full Time Pro ($4.99/mo)**. The only Pro benefit enforced **today** is pundit selection: free gets the one house voice, the other five pundits are Pro. The rest of the Pro list on `/pro` is honest near-term roadmap, not yet built. Stripe runs on the **test key** on purpose (0 users, features not built), so no real charges happen.

### `entitlement.ts` (client-safe, import from either side)

The shared vocabulary. **No secrets, no server-only imports**, so it is safe to import in components and in server functions alike:

- types `Plan` and `Entitlement`;
- `FREE_VOICE_STYLE` (the one free voice) and `PRO_VOICE_STYLES` (the five Pro voices), plus `isProVoiceStyle(id)`;
- `isProProfile(row)` -- the **single source of truth** for "is this profile entitled to Pro right now" (pro plan + active/trialing status + not past `current_period_end`). Used by both the client hook and the server gates so they can never disagree;
- display constants `PRO_PRICE_DISPLAY` / `PRO_PRICE_PERIOD`.

### `use-entitlement.ts` (client hook)

Wraps `getEntitlement` in TanStack Query keyed by user id, returns `{ entitlement, isPro, loading, refetch }`, and falls back to an anonymous free entitlement when signed out. This is what gates the UI (e.g. the Pro pundits in `VoiceSelector`).

### `billing.functions.ts` (server functions)

All auth-gated via `requireSupabaseAuth`, all lazy-importing Stripe and `supabaseAdmin` inside the handler:

- `getEntitlement` -- reads the caller's own profile **under RLS** and shapes it through `isProProfile`.
- `createCheckout` -- finds or creates the Stripe customer (storing `stripe_customer_id` on the profile), opens a subscription Checkout session, returns the hosted URL.
- `createPortal` -- opens the Stripe Billing Portal for the caller's customer.
- `syncCheckout` -- belt-and-suspenders: on the `/pro?status=success` return, reconciles entitlement straight from Stripe so Pro reflects instantly even if the webhook is a beat behind. It refuses a session whose `client_reference_id` is not the caller.

`stripe.server.ts` holds the lazy `getStripe()` singleton and `proPriceId()`; the `.server.ts` suffix keeps the Stripe SDK out of the client bundle.

### `webhook.ts` (public Stripe endpoint)

`src/routes/api/stripe/webhook.ts`. Authenticity comes from the **Stripe signature verified against the raw request body** (`STRIPE_WEBHOOK_SECRET`), not from Supabase auth. It handles `checkout.session.completed`, the `customer.subscription.*` events, and `invoice.paid` / `invoice.payment_failed`, and is **idempotent** because every handler recomputes profile state from Stripe. Transient (e.g. DB) failures return 500 so Stripe retries with backoff.

### `billing-sync.server.ts` (shared writer)

`applySubscriptionToProfile(admin, stripe, sub)` is the one place that maps a Stripe subscription onto the profile's entitlement columns, shared by the webhook and `syncCheckout` so both write identically. It resolves the owning user via subscription metadata, then the stored customer, then the customer's own metadata, and reads the paid period from the subscription **item** level first (newer Stripe API) before falling back to the subscription level. It writes with the **service-role** client.

### The billing guard (migration `20260705120000_billing.sql`)

The entitlement columns (`plan`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `current_period_end`, `price_id`) live on `profiles`. A `BEFORE INSERT OR UPDATE` trigger, `enforce_profile_billing_guard`, runs `SECURITY INVOKER` so `current_user` is the real caller role. When the caller is `authenticated` or `anon` it **forces those columns back to their old (or free) values**, so the existing "Profiles self update" RLS policy can never be used to self-grant Pro. Only `service_role` (the webhook / `syncCheckout` admin client) can actually write them. This closed a real self-grant hole.

### Enforcement is layered (defence in depth)

1. **UI** -- `use-entitlement` hides/locks the Pro pundits.
2. **Server** -- `setVoiceStyle` in `profile.functions.ts` calls `isProVoiceStyle` then `isProProfile` and rejects a Pro pundit for a non-Pro caller, so a direct RPC cannot bypass the UI.
3. **DB** -- the billing guard trigger makes the entitlement columns unwritable by user roles.

### Going live later

Charging real users now is deliberately premature. To flip on: build the real Pro features, create a **live-mode** webhook, swap the three Stripe env vars (`STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`) to live values, and redeploy.

## Build & dev

```bash
bun install
bun run dev      # localhost:5173
bun run build    # production build
```

Do not run `tsc`, `npm run build`, or `bun run build` manually as a checkpoint -- the harness does it automatically and reports back. Run only when you need to reproduce a failure locally.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot apply unknown utility class 'X'` in a CSS module | Tailwind v4 `@apply` only works in the entry CSS | Add `@reference "../styles.css"` at top of that file |
| Border invisible after edit | v4 bare `border` = `currentColor` | Name the colour: `border-[var(--pitch-line)]` |
| A server route "calls" a server function and it fails / loops | `createServerFn` is an RPC endpoint, not a plain function | Export the plain async fn (e.g. `runEpisodePipeline`) and call that server-side; wrap in `createServerFn` only for clients |
| Daily drop produced no episode for a match | The recap failed the gate + judge 5 times (fail-closed by design) | Check the cron logs; the pipeline throws rather than publish a wrong recap. Fix the facts/corpus, do not loosen the gate |
| Non-Pro user set a Pro pundit | Should be impossible | Blocked in three places: `use-entitlement`, `setVoiceStyle`, and the billing guard trigger. Do not route entitlement writes around them |
| `Unauthorized` on a server fn during `build:dev` | `requireSupabaseAuth` called from a public-route loader during SSR | Call from a component via `useServerFn` + `useQuery`, never a public loader |
| Stripe webhook returns `Bad signature` | Verifying against a parsed/JSON body instead of the raw text | Read `request.text()` and pass the raw string to `constructEventAsync` |
| `Expected 3 parts in JWT; got 1` from PostgREST | Using `supabaseAdmin` for an ordinary Data API read | Use the publishable client or `requireSupabaseAuth` |
| Service worker serving stale HTML in preview | Old PWA cache | Already guarded -- `public/sw.js` is push-only, no cache |
| Edit fails after a content change | `routeTree.gen.ts` is stale | Restart dev server (TanStack regenerates it) |

## Where the bodies are buried

- **`src/lib/api/recap-generator.server.ts`** is server-only and talks to Anthropic directly over `fetch`. Accuracy is a property of the deterministic fact-pack + code gate + judge, not of the prompt. Do not "simplify" by trusting the model to credit goals or state the score. Model ids are overridable via `WRITER_MODEL` / `JUDGE_MODEL`.
- **`src/lib/api/episode-pipeline.functions.ts`** requires `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY`; it throws with a clear message if either is missing. It is **fail-closed**: a match whose recap does not pass the gate + judge gets **no** episode. The cron catches per-match, so a failed or missing key fails that drop but not the endpoint.
- **`src/lib/player-store.ts`** has both a real `<audio>` path and a simulation fallback used by the seeded demo episodes. Don't delete the simulator until every seed row has a real audio URL.
- **The billing columns on `profiles` are service-role-only.** The `enforce_profile_billing_guard` trigger silently resets them for `authenticated` / `anon` writers. If entitlement "won't stick" from an ordinary client write, that is the guard working as designed -- route the write through Stripe -> webhook / `billing-sync.server.ts`.
- **`public/sw.js`** is a push-display worker only. It is NOT an app-shell cache. Do not turn it into one -- see the PWA guidance in the project context.

## Secrets

| Name | Used by | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | recap generator | Opus writer + Sonnet judge |
| `WRITER_MODEL` / `JUDGE_MODEL` (optional) | recap generator | Override the default `claude-opus-4-8` / `claude-sonnet-4-6` |
| `ELEVENLABS_API_KEY` | episode pipeline | TTS |
| `ELEVENLABS_VOICE_ID` (optional) | episode pipeline | Voice (defaults to Daniel) |
| `STRIPE_SECRET_KEY` (test) | `stripe.server.ts` / billing | Checkout, portal, subscription reads |
| `STRIPE_PRO_PRICE_ID` | `stripe.server.ts` | The Pro subscription price |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook route | Raw-body signature verification |
| `CRON_SECRET` | cron route | Bearer auth for the daily drop |
| `SUPABASE_PUBLISHABLE_KEY` | cron route (fallback) | Legacy `apikey` cron auth |
| `APP_URL` (optional) | billing redirects | Fallback checkout/portal return origin |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | push fanout | Morning push |
| `VITE_PLAUSIBLE_DOMAIN` (publishable) | `__root.tsx` | Analytics script |

Set via the Vercel project env (server secrets) and Supabase; the client-visible `VITE_*` values are the only ones bundled. Never commit. To take Stripe live, swap the three `STRIPE_*` values to live-mode and point a live-mode webhook at the webhook route.
