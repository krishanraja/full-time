# 01 - Brand system

- **Status:** Current
- **Owner:** Founder and design
- **Purpose:** Govern Full Time's visual language, brand voice, product copy, and share assets.
- **Last reviewed:** 2026-08-10

## Brand idea

Full Time should feel like a modern broadcast desk after the noise has cleared: dark, exact, quick, opinionated, and alive in the details.

The product has six personalities. The brand around them remains stable. It promises evidence, accountability, and a sharper morning, then gives each pundit room to perform.

## Name and proposition

Use **Full Time**, two words and title case. Never use `FullTime`, `Fulltime`, or `FT` in public copy. The wordmark renders `FULL_TIME`; the underscore belongs to the mark, not the spoken name.

Primary proposition:

> One football morning. Six genuinely different minds. Every prediction gets a receipt.

Long-form proposition:

> Six genuinely different pundits. One verified evidence base. Every opinion earns its reason, and every prediction comes back for judgment.

## Assets

Canonical assets live in `src/assets`:

- `full-time-mark.png.asset.json`: CDN pointer for the lime stopwatch/player mark;
- `full-time-wordmark.png.asset.json`: CDN pointer for the white wordmark;
- `full-time-icon-and-favicon.png`: application icon and favicon source;
- `full-time-wordmark.png` and `full-time-wordmark-trim.png`: local production fallbacks.

Rules:

- Keep the mark at least 24 pixels square and the wordmark at least 16 pixels high.
- Leave clear space equal to the mark's dot radius on every side.
- Do not recolor, stretch, outline, bevel, or animate the logo.
- Use the white wordmark on dark surfaces. Use the mark alone when space is tight.
- Do not use club, league, or broadcaster marks without recorded permission.

## Color

[`src/styles.css`](../src/styles.css) is the source of truth. Components use semantic tokens or named brand tokens; they never hardcode colors.

| Token                | Value                    | Job                                  |
| -------------------- | ------------------------ | ------------------------------------ |
| `--background`       | `oklch(0.155 0.008 240)` | Main pitch-black canvas              |
| `--card`             | `oklch(0.195 0.01 240)`  | Raised surfaces                      |
| `--pitch-line`       | `oklch(1 0 0 / 8%)`      | Hairlines and dividers               |
| `--foreground`       | `oklch(0.985 0.004 240)` | Primary text                         |
| `--muted-foreground` | `oklch(0.68 0.012 240)`  | Secondary text                       |
| `--lime`             | `oklch(0.88 0.24 138)`   | Active controls, focus, key evidence |
| `--lime-glow`        | `oklch(0.93 0.22 138)`   | Controlled halo                      |
| `--ember`            | `oklch(0.72 0.2 35)`     | Genuine live or breaking state only  |

Lime is a signal, not a background. Use it for play, active progress, selected state, focus, the most important metric, and small editorial labels. If it dominates the viewport, the hierarchy has failed.

## Typography

Full Time uses Geist for display and body copy, and Geist Mono for information that behaves like data. Font links live in `src/routes/__root.tsx`; family tokens live in `src/styles.css`.

- Headings: 600 weight, tight tracking, compact line height.
- Body: readable sentence case, usually `text-sm` or `text-base`.
- Eyebrows: the `eyebrow` utility, uppercase, mono, tracked, and brief.
- Scores, dates, times, percentages, model metrics, and durations: `text-mono` with tabular figures.
- Use `text-foreground` and `text-muted-foreground`, never `text-white` or `text-black`.

## Surfaces and layout

- Use `surface` for raised cards and `hairline` for dividers.
- Prefer one dominant editorial object per viewport.
- Build dense lists with clear grouping, not ornamental cards around every row.
- Preserve generous touch targets and strong focus treatment on mobile.
- Let the audio player remain visually persistent without overpowering the story.
- Relume may supply interaction references. Do not copy its source or let its defaults override Full Time tokens.

## Motion

Motion explains state:

1. the daily-show hero enters once;
2. the selected or playing state gains a lime edge and restrained glow;
3. panels and disclosures use short, accessible transitions.

Avoid hover scale, parallax, looping decoration, bouncing icons, or animated numbers. Respect reduced-motion preferences. A football product can feel fast without making everything move.

## Brand voice and pundit voice

Brand copy is composed, direct, and exact. Pundit copy may be warmer, drier, darker, nerdier, or more provocative according to the selected spec.

| Brand does                      | Brand avoids                          |
| ------------------------------- | ------------------------------------- |
| Names the product state plainly | Manufactured urgency                  |
| Uses concrete football language | Generic AI claims                     |
| Makes one promise at a time     | Feature-list slogans                  |
| Shows evidence and receipts     | "Trust us" language                   |
| Uses short CTAs                 | Emoji, shouting, or false live labels |

Approved examples:

- "Choose your pundit. Keep the receipts."
- "No approved show for this morning yet."
- "The data shows what happened, but not why."
- "Six editions. Same facts. Different judgments."
- "This prediction was wrong. Here is what it missed."

Avoid: `game-changing`, `next-generation`, `AI-powered experience`, `must-listen`, `unmissable`, `fine margins`, and `wanted it more`.

## Share system

Share cards are generated in `src/lib/pundit/share-card.server.ts` at 1200 by 630. They should contain:

- Full Time mark and wordmark;
- selected pundit identity;
- one portable line or prediction receipt;
- match identity and coverage date;
- enough visual evidence to distinguish a prediction, a result, and a reversal.

Shared links preview the chosen pundit but never overwrite the recipient's saved preference without confirmation.

## Accessibility

- Text and controls must meet WCAG contrast expectations against both background tokens.
- Lime cannot be the sole state signal; pair it with copy, iconography, or shape.
- Keyboard focus stays visible.
- Audio has a transcript and meaningful failure state.
- Pinch zoom remains enabled.
- Motion respects `prefers-reduced-motion`.
- Icon-only controls require accessible names.

## Review checklist

- Uses repository assets and tokens.
- Reads correctly without color or motion.
- Separates brand voice from pundit performance.
- Labels archive, demo, prediction, receipt, and live state honestly.
- Contains no living-pundit imitation, unsupported club marks, or generic AI copy.
- Looks deliberate at 320 pixels, tablet width, and desktop.
