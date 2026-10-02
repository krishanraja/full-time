# 01 - Brand system

- **Status:** Current
- **Owner:** Founder and design
- **Purpose:** Govern Full Time's visual language, AI Pundit identity, public voice, copy, and generated assets.
- **Last reviewed:** 2026-10-02

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
- “First show is on the way.”
- “No match to cover today.”
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

## Generated visual system

Ruling (Krish, 2026-10-02): adopt the premium synthesis. Three pieces of procedural art carry the product's imagery. All of them are deterministic SVG built in product code from the match and the drop ID, so a match always looks the same and the next match looks different. No image model, stock photo, or player likeness is involved.

- **AI Pundit covers** (`src/lib/pundit-cover.ts`, `PunditCover.tsx`): a screenprint-style cover per AI Pundit, on that AI Pundit's own paper colour, with a motif that reads the match. The Reporter's cover is a printed column, The Gaffer's a tactics board with one O per goal in the scoring club's ink, The Numbers Guy a bar grid, The Romantic woven threads, The Doomer a falling line, The Wind-Up a wave. They replace the orbit avatars of `PunditAvatar.tsx`, which is no longer rendered.
- **The match seal** (`src/lib/match-seal.ts`, `MatchSeal.tsx`): the engraved ring that holds the score on Today. A guilloche weave, like a watch dial or a banknote, in the home club's colour on the left half and the away club's on the right, around a 90-minute track that echoes the stopwatch in the mark. More goals make the weave finer, and the winner's half prints at full strength.
- **The matchday atmosphere** (`src/lib/match-atmosphere.ts`, `MatchAtmosphere.tsx`): floodlight from each club's corner in its own colour behind the seal, a far touchline, LED boards split at halfway, and faint mown stripes. It is atmosphere, so it stays quiet and fades out before the AI Pundits.

Club colours live in `src/lib/club-colours.ts`. Lift a colour's lightness in OKLCH and keep its hue and chroma, so claret stays claret and navy stays navy on the dark ground; HSL lightening turned them pink and periwinkle. Club crests sit on a cream disc ringed in the club's colour (`CrestDisc.tsx`), and a crest that fails to load shows the club's initials, not an empty circle.

Describe the covers as a **fresh generated look for each match**. Do not claim an image model produced them, that they represent a real person, or that every page view creates a new identity.

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

Keep the mark at least 24 pixels square and the wordmark at least 16 pixels high. Do not recolor, stretch, outline, bevel, or animate the logo. Do not use league, broadcaster, player, or competition marks without recorded permission; name the Premier League in text, never with its logo.

Club crests are the one exception. Ruling (Krish, 2026-09-27): show club crests from the provider's public imagery, accepting the trademark exposure. They come from `teams.crest_url` through `src/components/ClubCrest.tsx`, sit beside the club's name on Today and Teams, and are never recolored, cropped, or used as Full Time's own mark. [`docs/11-legal.md`](11-legal.md) records the exposure.

## Color

[`src/styles.css`](../src/styles.css) is authoritative.

| Token          | Value                    | Job                                           |
| -------------- | ------------------------ | --------------------------------------------- |
| `--ground`     | `#1c1611`                | Warm umber ground                             |
| `--ground-2`   | `#15110d`                | Darker ground toward the tab bar; background  |
| `--raise`      | `#261f19`                | Cards and sheets (`--card`)                   |
| `--ink`        | `#f1e9da`                | Cream: primary text, focus ring, active state |
| `--ink-2`      | `#b9ac98`                | Secondary text                                |
| `--ink-3`      | `#998c7a`                | Quiet labels and inactive tabs                |
| `--pitch-line` | `rgb(241 233 218 / 13%)` | Hairlines and dividers                        |
| `--lime`       | `oklch(0.88 0.24 138)`   | The mark, play and pause, and progress only   |
| `--ember`      | `oklch(0.72 0.2 35)`     | Genuine urgent or breaking state only         |

Lime is the logo's green and it means play. It appears on the mark, the play and pause button, and the progress fill, and nowhere else: not on buttons, tabs, selection, or links. Selection and the active tab are cream. Colour beyond that comes from the clubs and the AI Pundits' papers, never from the shell.

## Typography and layout

Two faces, both self-hosted from the app's own origin through `@fontsource` under the SIL Open Font License:

- **Instrument Serif** for the score, club names, AI Pundit names, and headings, with italic for the quiet voice ("Pick your AI Pundit", "Show me why", the "The" in an AI Pundit's name);
- **Schibsted Grotesk** for everything else: labels, status, times, and body copy.

There is no mono face in the product shell. Body copy stays sentence case; small state labels such as READY and PLAYING may use tracked capitals.

Today has one dominant object: the match, the seal that holds its score, and the player under it. Secondary explanation sits behind "Show me why". Avoid rows of marketing statistic cards above playback.

Use `surface`, `hairline`, `eyebrow`, and semantic tokens. Preserve 44-pixel touch targets, visible focus, pinch zoom, reduced motion, safe areas, and readable contrast.

## Motion

Motion explains state. The selected AI Pundit's paper colour washes faintly into the lower ground. Drawers and disclosures may use short transitions. Avoid hover scale, parallax, looping decoration, bouncing icons, and animated numbers.

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
