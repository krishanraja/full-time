# 01 · Brand

**Role:** Designer, brand writer, marketer, any agent applying visuals or copy.
**Read this when:** picking colours, fonts, writing UI copy, designing assets, OG images, social posts.
**Don't read this when:** writing backend code (→ `02-developer.md`).

---

## Name

**Full Time.** Two words, always capitalised.
- Never "FullTime", "Fulltime", "FT" (FT is the Financial Times).
- The wordmark file renders it as `FULL_TIME` (underscore is part of the mark, not the name).

## Logo

Two assets, served from CDN via pointers in `src/assets/`:

- `full-time-mark.png.asset.json`, the green stopwatch+player monogram. Used for app icon, favicon, OG image avatar.
- `full-time-wordmark.png.asset.json`, white `FULL_TIME` wordmark. Used in the top-left of the app header on every route via `src/components/AppHeader.tsx`.

Rules:
- Minimum mark size: 24 px square.
- Minimum wordmark height: 16 px.
- Clear space: at least 1× the mark's "dot" radius on every side.
- Never recolour the mark. The lime is fixed.
- Never set the mark on white. It's designed for dark.
- The white wordmark is the only wordmark, there is no dark version yet. If a light surface is needed, use the mark alone.

## Palette

All tokens live in `src/styles.css` and are exposed as `--lime`, `--background`, etc. **Never hardcode colours in components.** Always reach through tokens or shadcn semantic classes.

| Token | OKLCH | Use |
|---|---|---|
| `--background` (pitch) | `0.155 0.008 240` | Page background, near-black with a cool tilt |
| `--card` (pitch-raised) | `0.195 0.01 240` | Cards, surfaces, raised elements |
| `--pitch-line` | `oklch(1 0 0 / 8%)` | Every hairline, divider, border |
| `--foreground` (chalk) | `0.985 0.004 240` | Primary text |
| `--muted-foreground` | `0.68 0.012 240` | Secondary text, eyebrows |
| `--lime` | `0.88 0.24 138` | **The accent.** Affordances, active state, key moments only |
| `--lime-glow` | `0.93 0.22 138` | Halos, the `glow-lime` utility |
| `--ember` | `0.72 0.2 35` | Reserved, live / breaking only. Do not use casually |

### Lime is precious

Lime appears on: the play button, the active progress fill, the active nav indicator, the score on the mini-player, the badge outline ("BIGGEST MOMENT", etc.), the focus ring, eyebrows. **Nothing else.** If lime is on more than ~15% of the visible viewport at any moment, you've broken the system.

## Typography

Loaded via `<link>` in `src/routes/__root.tsx` from Google Fonts.

- **Geist** (400/500/600/700/800), display + UI body.
- **Geist Mono** (400/500/600), scores, kickoff times, durations, eyebrows, anywhere a number reads as data.

Why these: Geist is engineered, neutral, and reads more like a pro broadcast tool than a content app. Geist Mono ties to the wordmark's mono-ish character.

Tokens: `--font-sans`, `--font-display`, `--font-mono` in `src/styles.css`.

### Type rules

- Headings: `font-semibold` (600), `tracking-tight`, `leading-tight`. Never `font-extrabold` (was used pre-rebrand, now removed).
- Body: `text-sm` default.
- Eyebrows: use the `eyebrow` utility class (mono, 11px, 0.22em tracking, lime, uppercase). Section titles use this.
- Numerals: always `text-mono` utility (mono font + tabular figures). Scores, times, durations, percentages.
- Never `text-white` / `text-black`. Use `text-foreground` / `text-muted-foreground`.

## Surfaces

Use the `surface` utility for cards: card background + 1px hairline + subtle inset highlight + drop shadow. Avoid gradient-on-white. Avoid stacking shadows.

The `hairline` utility is a single token border in `--pitch-line`. Use for any divider.

## Motion

Two signature moments:

1. **Home hero enter**, score and badge fade up on initial paint (~250ms).
2. **Play-state transition**, the active card gets a lime border and the `glow-lime` shadow ramps in.

Everywhere else: motion should be invisible. No micro-interactions on every button. No card hover scales. No parallax.

Library: Framer Motion (`framer-motion`).

## Voice & tone

We sound like a calm, confident match reporter. Not a hype account.

| Do | Don't |
|---|---|
| "Yesterday's biggest stories from the Big Five, narrated." | "🔥 UNREAL GOALS FROM YESTERDAY 🔥" |
| "Up by 7am, daily." | "Catch the action whenever you want, wherever you are!" |
| "60 seconds." | "Quick & easy bite-sized recaps" |
| Short sentences. Periods. | Exclamations. Emoji. |
| Mono for numbers. | Spelling out scores. |

Word bank we like: *drop, recap, the morning, the cut, the story, lean, calm, narrated, every match that mattered.*

Words we avoid: *amazing, incredible, must-listen, game-changer, content, podcast network, hub, hot takes, breaking, exclusive.*

## OG / share image

Not built yet, see `12-roadmap.md`. When built: dark `#0b0d0c` background, mark top-left at ~88px, wordmark bottom-left at ~36px tall, leave the right ~60% clear for episode-specific overlays.

## Iconography

Lucide React. Stroke width 1.75 for inactive, 2.25 for active. Never fill an icon with lime, the play button is the only filled lime element in the system.

## Do / don't summary

✅ Lime on dark · hairlines everywhere · mono numerals · sparse motion · sentences end with periods.
❌ Purple/indigo gradients · white background · drop-shadow stacks · emoji in UI copy · the word "amazing".
