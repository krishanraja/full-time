# 13 · Agent Handoff

**Role:** Any AI agent picking this codebase up cold.
**Read this when:** the very first turn you work on Full Time.
**Don't read this when:** you've already been working on this project this session.

---

## What this project is

Full Time is a daily AI-narrated football recap app. One paragraph: every morning at 7am we generate ~60-second audio recaps for the Big-5 leagues' previous-day matches, push them to subscribers, and serve them as a tap-once PWA.

Long form: `00-product.md`.

## What's already built

Most of it. Backend (8 tables, RLS, realtime), AI pipeline (Gemini 3 Flash → safety filter → ElevenLabs → Storage), cron endpoint, magic-link auth, follows, voice preference, push (client + fanout), PWA, Plausible, full brand system, full docs.

What is gated on the user adding secrets: ElevenLabs key (for real TTS), VAPID keys (for push fanout), GitHub Actions secrets (for cron schedule).

What is intentionally still mocked: match data (seeded in DB; API-Football adapter is on the roadmap).

## First-turn checklist for any agent

1. **Read the role you're operating in.**
   - Writing code? → `02-developer.md` + `01-brand.md`.
   - Designing? → `01-brand.md`.
   - Ops issue? → `06-ops.md`.
   - Talking to a user? → `10-support.md`.
   - Asked about money / partnerships? → `08-sales.md` / `11-legal.md`.

2. **Don't reintroduce these mistakes** (each cost us a turn earlier):
   - Hardcoded colours like `text-white`, `bg-[#0a0a0c]`. Use tokens.
   - `@import` of a URL in `styles.css`. Use a `<link>` in `__root.tsx`.
   - Service-role import at module scope of a `.functions.ts` file. Import inside the handler.
   - Creating `src/pages/` or `app/`. We use TanStack file-based routing in `src/routes/`.
   - Calling a `requireSupabaseAuth` server fn from a public-route loader. Use a component + `useServerFn`.
   - Re-adding mock reads in components. Read from the DB via `useTodayFeed`.

3. **Use the docs as the contract**:
   - Brand decisions ≠ vibe — `01-brand.md` is law.
   - Banned terms / system prompt — `05-content-safety.md` is law.
   - Decision log lives in `12-roadmap.md` — log new decisions there.

4. **When in doubt about scope**, look at:
   - The roadmap (`12-roadmap.md`) for what's in / out.
   - The "Explicitly NOT doing" table — those are rejected with reasons.

## Cheat sheet: where things live

```
src/styles.css                   design tokens (the brand is here)
src/components/AppHeader.tsx     wordmark + lime hairline on every route
src/components/AudioCard.tsx     hero & carousel cards
src/lib/api/episode-pipeline.functions.ts   the AI pipeline
src/routes/api/public/cron.daily-drop.ts    the cron endpoint
supabase/migrations/             DB schema
docs/                            you are here
```

## Things that look weird but are deliberate

- The mini-player progress bar is 2px and lime. It's the only persistently visible lime element. Don't thicken it.
- BottomNav active state is a 2px underline, not a filled pill. We're broadcast tool, not consumer fluff.
- The hero card shows the score in mono, with the away score muted. That's the editorial hierarchy — home is "the protagonist" of the line.
- `public/sw.js` is push-only, not an app-shell cache. Don't add caching to it.
- We ship a lot of `text-mono` for numbers. That's intentional. Don't convert them to the body font.

## What earns you a high-five

- A change ships without touching colours or fonts directly in components.
- New routes set proper `head()` metadata (title, description, og:title, og:url, canonical).
- New server functions live in `*.functions.ts` and import `supabaseAdmin` inside the handler.
- New tables come with `GRANT` + `ENABLE RLS` + `CREATE POLICY` in the same migration.
- The decision log gets a new entry when you make a real choice.

Welcome to Full Time. Read the role file. Then ship.
