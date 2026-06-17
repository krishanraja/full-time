# GoalBot Radio

Daily AI-narrated football recaps. Mobile-first, single-tap habit app.

## Run

```bash
bun install
bun dev
```

Open at the preview URL on a phone (or 390px-wide DevTools).

## Architecture

- **Framework:** TanStack Start (file-based routing, SSR-ready) + React 19, Tailwind v4, shadcn-style tokens.
- **State:** zero external state lib. Tiny pub/sub stores in `src/lib/player-store.ts` and `src/lib/follow-store.ts` exposed via `useSyncExternalStore`.
- **Audio:** simulated with a 4Hz timer that advances a `progress` value (0..1). Swap for a real `<audio>` element when the streaming API is ready.
- **Haptics:** `src/lib/haptics.ts` wraps the Vibration API. iOS Safari is a silent no-op.
- **Mock data:** `src/data/mockEpisodes.ts`. Replace this single file with an API client.
- **Routes:** `/` (Today), `/feed`, `/following`, `/settings`. Persistent `MiniPlayer` + `BottomNav` live in `__root.tsx`.

## Components

`AudioCard`, `MiniPlayer`, `ExpandedPlayer`, `EpisodeListItem`, `FollowButton`, `HapticButton`, `VoiceSelector`, `BottomNav`, `CompletionToast`.

## Next 7 build steps to a live MVP

1. **Real audio playback** — replace the simulated timer in `player-store.ts` with an `<HTMLAudioElement>` and stream from `episode.audioUrl`.
2. **Episode API** — replace `src/data/mockEpisodes.ts` with `GET /api/episodes/today` (returns the same `Episode[]` shape).
3. **AI narration pipeline** — nightly cron: pull final scores → generate 30–90s script per match → TTS → upload mp3 → enqueue into the feed.
4. **Voice + follow persistence** — store `voiceStyle` and followed team ids in localStorage now, server-side once accounts exist.
5. **Web Push** — opt-in from Settings, fire at 7:30am with a deep link into the Today hero card.
6. **Lock-screen controls** — wire MediaSession metadata (title, artwork, play/pause/seek handlers) so it behaves like a real podcast app.
7. **Ship as a PWA** — manifest + service worker, standalone display, install prompt after second session.
