# 01 - Brand system

- **Status:** Current
- **Owner:** Founder and design
- **Purpose:** Govern Full Time's visual language, AI Pundit identity, public voice, copy, and generated assets.
- **Last reviewed:** 2026-08-11

## Brand idea

Full Time is a playful AI football toy with serious facts underneath.

The surface feels simple, warm, quick, and slightly cheeky. The machine is visible and worth celebrating. Avoid the tone of a broadcast newsroom, betting terminal, analytics consultancy, or solemn product-marketing page.

The product has six AI Pundits. The shell stays calm enough for each one to feel different.

## Name and proposition

Use **Full Time**, two words and title case. The wordmark renders `FULL_TIME`; the underscore belongs to the mark.

Primary proposition:

> One real match. Six AI Pundits. Pick the brain you fancy.

Supporting explanation:

> Each AI Pundit makes a complete show from the same checked football facts.

Use **AI Pundit** everywhere a user can see or hear the term. Do not describe the product as a human podcast, a replacement pundit, or a voice skin.

## Voice

Primary copy should work for a ten-year-old:

- short, concrete words;
- one idea at a time;
- football language people already use;
- a warm joke where it helps;
- no technical performance language on the first layer;
- no fake certainty or fake excitement.

| Brand does                              | Brand avoids                                |
| --------------------------------------- | ------------------------------------------- |
| Says what the listener can do now       | Lists pipeline features                     |
| Makes AI the source of fun              | Apologizes for AI or hides it               |
| Keeps facts plain                       | Uses academic evidence language             |
| Names a wobble, miss, or limit honestly | Sounds grave or legalistic in normal states |
| Uses one clear action                   | Adds several competing CTAs                 |

Approved examples:

- “Pick your AI Pundit.”
- “Same match. Six complete shows.”
- “Counts everything. Trusts almost nothing.”
- “Show me why.”
- “Nothing ready just yet.”
- “Your old show is still here.”
- “What they said, what happened, and the bit they missed.”
- “The data shows what happened, but not always why.”

Avoid in primary UI: `calibration`, `Brier score`, `variance`, `harness`, `baseline`, `ledger`, `synthetic profile`, `probabilistic`, `atomic`, and `evidence pack`. Use those terms internally or define them behind optional detail.

Avoid marketing filler such as `game-changing`, `next-generation`, `must-listen`, `unmissable`, `unbiased`, `seamless`, `revolutionary`, and `AI-powered experience`.

## AI Pundit personality copy

| AI Pundit       | Short public line                             |
| --------------- | --------------------------------------------- |
| The Reporter    | Calm, clear, and first with the facts.        |
| The Gaffer      | Spots the choices that changed the game.      |
| The Numbers Guy | Counts everything. Trusts almost nothing.     |
| The Romantic    | Finds the bit that made football feel magic.  |
| The Doomer      | Sees the wobble before anyone else.           |
| The Wind-Up     | Starts arguments for fun. Football needs one. |

Longer settings copy may use each AI Pundit's strongest joke, but it must stay legible and avoid invented tactical certainty.

## Generated avatar system

Each AI Pundit needs a recognizable abstract motif, not a fake human face. The current component in `PunditAvatar.tsx` combines:

- a fixed motif for the AI Pundit;
- a seeded rotation, orbit, and dot field;
- the daily-drop ID and AI Pundit ID as the seed.

The result changes between editions and stays stable inside one edition. Describe it as a **fresh generated look** or **generated edition avatar**. Do not claim an image model produced it, that it represents a real person, or that every page view creates a new identity.

## Hero and line wrapping

Hero text must never leave a one-word orphan, hyphenate, or break a word unnaturally.

- Use balanced wrapping and the `withoutOrphan` helper for dynamic titles.
- Keep titles within roughly 18 to 20 characters per line at mobile sizes.
- Use `hyphens: none` and normal overflow wrapping on display text.
- Test real title extremes at 320, 393, tablet, and desktop widths.
- Rewrite copy when CSS cannot produce a natural break.

The same rule applies to cards, drawer titles, navigation labels, and empty states. A clever line that wraps badly is not approved.

## Assets

Canonical assets live in `src/assets`:

- `full-time-mark.png.asset.json`: CDN pointer for the lime stopwatch/player mark;
- `full-time-wordmark.png.asset.json`: CDN pointer for the white wordmark;
- `full-time-icon-and-favicon.png`: icon and favicon source;
- `full-time-wordmark.png` and `full-time-wordmark-trim.png`: local fallbacks.

Keep the mark at least 24 pixels square and the wordmark at least 16 pixels high. Do not recolor, stretch, outline, bevel, or animate the logo. Do not use club, league, broadcaster, player, or competition marks without recorded permission.

## Color

[`src/styles.css`](../src/styles.css) is authoritative.

| Token                | Value                    | Job                                   |
| -------------------- | ------------------------ | ------------------------------------- |
| `--background`       | `oklch(0.155 0.008 240)` | Main dark canvas                      |
| `--card`             | `oklch(0.195 0.01 240)`  | Raised surfaces                       |
| `--pitch-line`       | `oklch(1 0 0 / 8%)`      | Hairlines and dividers                |
| `--foreground`       | `oklch(0.985 0.004 240)` | Primary text                          |
| `--muted-foreground` | `oklch(0.68 0.012 240)`  | Secondary text                        |
| `--lime`             | `oklch(0.88 0.24 138)`   | Play, focus, active state, key facts  |
| `--lime-glow`        | `oklch(0.93 0.22 138)`   | Restrained halo                       |
| `--ember`            | `oklch(0.72 0.2 35)`     | Genuine urgent or breaking state only |

Lime is a signal, not a wallpaper.

## Typography and layout

The font stack prefers Geist for display and body copy and Geist Mono for data-like labels, then falls back to system fonts when those faces are unavailable. The current repository does not load a web-font provider. Headings use compact line height and tight tracking. Body copy stays sentence case. Dates, times, durations, and small state labels may use mono.

Today has one dominant object: the player. Secondary explanation sits below it. Avoid rows of marketing statistic cards above playback.

Use `surface`, `hairline`, `eyebrow`, and semantic tokens. Preserve 44-pixel touch targets, visible focus, pinch zoom, reduced motion, safe areas, and readable contrast.

## Motion

Motion explains state. The selected or playing state may gain a restrained lime edge. Drawers and disclosures may use short transitions. Avoid hover scale, parallax, looping decoration, bouncing icons, and animated numbers.

## Share system

Share cards are generated at 1200 by 630. They may contain the Full Time mark, AI Pundit identity, one approved line or settled record, match identity, and coverage date. Shared links may preview the chosen AI Pundit but must not overwrite the recipient's saved choice.

## Review checklist

- Says AI Pundit everywhere.
- Leads with what the listener can do.
- Feels playful and simple, not grave or over-engineered.
- Reads naturally at roughly a ten-year-old level.
- Uses a generated abstract identity, not a fake human likeness.
- Has no awkward wrap, orphan, clipped text, or horizontal overflow.
- Labels current, latest, archive, demo, settled, and pre-launch states honestly.
- Contains no living-pundit imitation, unlicensed marks, betting framing, or unsupported football claim.
