# 02 · Developer

**Role:** Anyone writing or refactoring code in this repo.
**Read this when:** adding a feature, fixing a bug, refactoring, onboarding.
**Don't read this when:** you only need product context (→ `00-product.md`) or system topology (→ `03-architecture.md`).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19, file-based routing, server functions) |
| Bundler | Vite 7 + Lightning CSS |
| Styling | Tailwind v4 (CSS-first, no `tailwind.config.js`) |
| Components | shadcn/ui + lucide-react |
| Motion | framer-motion |
| State (client) | TanStack Query + a few tiny `useSyncExternalStore` stores (`player-store.ts`, `follow-store.ts`) |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Realtime) |
| AI | Lovable AI Gateway → `google/gemini-3-flash-preview` |
| TTS | ElevenLabs (`eleven_turbo_v2_5`) |
| Push | Web Push (VAPID) via `web-push` in a server function |
| Analytics | Plausible (cookieless, optional via `VITE_PLAUSIBLE_DOMAIN`) |
| Runtime | Cloudflare Worker (workerd) with `nodejs_compat`. See `<server-runtime>` constraints — no `child_process`, `sharp`, `puppeteer`, etc. |

## File map

```
src/
  routes/                file-based routes (TanStack)
    __root.tsx           app shell, head, fonts, AppHeader, MiniPlayer, BottomNav
    index.tsx            "/" — Today
    feed.tsx             "/feed"
    following.tsx        "/following"
    settings.tsx         "/settings"
    auth.tsx             "/auth" — magic link
    legal.privacy.tsx    "/legal/privacy"
    legal.terms.tsx      "/legal/terms"
    api/public/
      cron.daily-drop.ts cron POST endpoint (apikey-guarded)
  components/
    AppHeader.tsx        sticky wordmark header (every route)
    Wordmark.tsx         wordmark + mark image components
    AudioCard.tsx        hero + carousel card
    EpisodeListItem.tsx  list row in Feed / Up next
    MiniPlayer.tsx       bottom-fixed playing strip
    ExpandedPlayer.tsx   full-screen player sheet
    BottomNav.tsx        4-tab bottom nav
    FollowButton.tsx     pill toggle
    VoiceSelector.tsx    settings voice radios
    HapticButton.tsx     button + haptic feedback
    CompletionToast.tsx  fires on play completion
  hooks/
    use-auth.ts          supabase session
    use-episodes.ts      useTodayFeed (TanStack Query + realtime)
  lib/
    api/                 server functions (.functions.ts) + .server.ts helpers
      feed.functions.ts
      follows.functions.ts
      listens.functions.ts
      profile.functions.ts
      push.functions.ts
      push-fanout.server.ts
      episode-pipeline.functions.ts   AI script → TTS → storage → DB
    player-store.ts      <audio> + MediaSession + useSyncExternalStore
    follow-store.ts      local follows + DB sync
    push-client.ts       subscribe/unsubscribe to web push
    haptics.ts
  integrations/supabase/  auto-generated client + types — DO NOT EDIT
  styles.css             ALL design tokens live here
  assets/                CDN pointers (.asset.json) — see Brand
supabase/migrations/     SQL migrations, timestamp-prefixed
public/                  manifest, icons, sw.js
docs/                    YOU ARE HERE
.github/workflows/       daily-drop.yml — cron trigger
```

## Conventions

### Tailwind v4

- Config lives in `src/styles.css`. **There is no `tailwind.config.js`.**
- Custom utilities use `@utility name { … }` — never `@layer utilities`.
- Never `@import` a URL in `styles.css`. Web fonts load via `<link>` in `__root.tsx`. See `<tailwind4-remote-css-imports>` in the agent's runtime context.
- Bare `border` is `currentColor` in v4 — always name the colour (`border-[var(--pitch-line)]` or `hairline` utility).

### Routing

- File-based, flat dot-separated. `routeTree.gen.ts` is auto-generated; never hand-edit.
- Every route MUST set `head()` with title, description, og:title, og:url, and a `canonical` link (root sets defaults, leaves override).
- Public API endpoints live under `src/routes/api/public/*`. **Verify caller inside the handler** (we use the Supabase publishable key in the `apikey` header for cron).

### Server functions

- File suffix `*.functions.ts` in `src/lib/api/`. **Never** put these under `src/server/` — import-protection blocks the whole tree.
- Service-role import (`@/integrations/supabase/client.server`) only inside `.handler()`, never at module scope of a `.functions.ts` file.
- `requireSupabaseAuth` middleware needs `attachSupabaseAuth` registered globally (already done in `src/start.ts`).

### Styling components

- Never hardcode colours (`text-white`, `bg-[#0a0a0c]`). Use semantic tokens (`text-foreground`, `bg-card`) or the brand tokens (`bg-[var(--lime)]`).
- Eyebrows: use the `eyebrow` utility class. Section titles always use eyebrows in this app, not h2.
- Numerals: add the `text-mono` utility wherever a number reads as data.
- Cards: use the `surface` utility.
- See `01-brand.md` for the full system.

### Data reads

Canonical pattern is **loader prefetch + `useSuspenseQuery` in the component** — but we currently use `useQuery` in some places (e.g. `useTodayFeed`) because the data is also subscribed to via realtime. Both are acceptable; do not regress to `useEffect + fetch`.

### Mocks vs real data

`src/data/mockEpisodes.ts` still exists for the `Episode` type and as a shape reference. **Frontend reads from the DB now via `useTodayFeed`.** Do not re-introduce mock reads in components.

## Build & dev

```bash
bun install
bun run dev      # localhost:5173
bun run build    # production build
```

Do not run `tsc`, `npm run build`, or `bun run build` manually as a checkpoint — the harness does it automatically and reports back. Run only when you need to reproduce a failure locally.

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot apply unknown utility class 'X'` in a CSS module | Tailwind v4 `@apply` only works in the entry CSS | Add `@reference "../styles.css"` at top of that file |
| Border invisible after edit | v4 bare `border` = `currentColor` | Name the colour: `border-[var(--pitch-line)]` |
| `Unauthorized` on a server fn during `build:dev` | `requireSupabaseAuth` called from a public-route loader during SSR | Call from a component via `useServerFn` + `useQuery`, never a public loader |
| `Expected 3 parts in JWT; got 1` from PostgREST | Using `supabaseAdmin` for an ordinary Data API read | Use the publishable client or `requireSupabaseAuth` |
| Service worker serving stale HTML in preview | Old PWA cache | Already guarded — `public/sw.js` is push-only, no cache |
| Edit fails after a content change | `routeTree.gen.ts` is stale | Restart dev server (TanStack regenerates it) |

## Where the bodies are buried

- **`src/lib/player-store.ts`** has both a real `<audio>` path and a simulation fallback used by the seeded demo episodes. Don't delete the simulator until every seed row has a real audio URL.
- **`src/lib/api/episode-pipeline.functions.ts`** assumes `ELEVENLABS_API_KEY` and `LOVABLE_API_KEY` are present. It throws with a clear message if not. The cron route catches per-match, so a missing key fails the drop but not the endpoint.
- **`public/sw.js`** is a push-display worker only. It is NOT an app-shell cache. Do not turn it into one — see the PWA guidance in the project context.

## Secrets

| Name | Used by | Required for |
|---|---|---|
| `LOVABLE_API_KEY` | episode pipeline | Script generation |
| `ELEVENLABS_API_KEY` | episode pipeline | TTS |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | push fanout | Morning push |
| `SUPABASE_PUBLISHABLE_KEY` | cron route auth check | Cron endpoint |
| `VITE_PLAUSIBLE_DOMAIN` (publishable) | `__root.tsx` | Analytics script |

Set via the Lovable Settings → Secrets UI. Never commit.
