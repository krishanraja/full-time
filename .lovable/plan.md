# Full Time — Visual Rebrand + Documentation Suite

Two parallel workstreams: (1) install the new brand assets and elevate the visual system to feel modern and sophisticated, (2) author a comprehensive `/docs` suite addressed to specialist AI agents.

---

## Part 1 — Brand & visual system

### Assets
- Upload the two PNGs to Lovable Assets (CDN) so they're not committed as binaries.
- Use the **icon** (`full_time_logo_2.png`) for:
  - `favicon` (32, 16 derived), `apple-touch-icon` (180), PWA `icon-192`/`icon-512` (replacing the current placeholders), `theme-color` meta.
- Use the **wordmark** (`full_time_wordmark-white.png`) for:
  - Top-left of the app shell (header on every route), small height (~22–24px), with the icon as a square mark to its left on home.
  - Open Graph image will be regenerated separately (icon + wordmark on dark) as a leaf-route polish task later — not in this plan.

### Design tokens (rewrite `src/styles.css`)
Pivot the whole palette to lean into the lime/electric-green identity, paired with deep near-black surfaces and a single warm signal color for live/important moments.

- `--pitch`: `oklch(0.16 0.01 240)` — base background (near-black with a cool tilt, not pure #000).
- `--pitch-raised`: `oklch(0.20 0.012 240)` — cards.
- `--pitch-line`: `oklch(0.26 0.012 240)` — hairlines.
- `--chalk`: `oklch(0.98 0.005 240)` — primary text.
- `--chalk-muted`: `oklch(0.68 0.01 240)` — secondary text.
- `--lime` (primary/accent, from logo): `oklch(0.88 0.24 135)`.
- `--lime-glow`: `oklch(0.92 0.22 135)` — for halos/shadows.
- `--ember` (live/important badge only): `oklch(0.72 0.20 35)`.
- `--gradient-lime`: `linear-gradient(135deg, var(--lime), var(--lime-glow))`.
- `--shadow-lime`: `0 10px 40px -12px color-mix(in oklab, var(--lime) 45%, transparent)`.
- All shadcn semantic tokens (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--ring`, etc.) re-map to the above via `@theme inline`. No component-level color hardcodes touched.

### Typography
Move off whatever defaults are currently rendering. Load via `<link>` in `__root.tsx` (per Tailwind v4 rule — never `@import` URLs in CSS):
- **Display**: `Geist` (semi-bold/medium, tight tracking) for hero match scores and big numerals — feels engineered, not sporty-cliché.
- **Body**: `Geist` regular for UI, `Geist Mono` for kickoff times, scores, durations, badge labels (the "engineered ticker" feel that matches the logo's mono-ish wordmark).
- Bind in `@theme`: `--font-display`, `--font-sans`, `--font-mono`. Removes any `Inter`/`Poppins` defaults.

### Component-level moves (no business-logic changes)
- **App header**: persistent sticky top bar (h-14), wordmark left, single thin lime hairline underneath, frosted blur over scrolling content.
- **Hero (Today)**: editorial layout — oversized mono score (`5-2`) as the visual anchor, team names in display weight underneath, lime accent reserved for the play affordance and the "BIGGEST MOMENT" badge.
- **Cards**: remove gradient-on-white "AI look"; use `--pitch-raised` surfaces, hairline borders, lime focus rings, and a single lime glow on the currently-playing card via `--shadow-lime`.
- **Player (mini + expanded)**: lime progress bar with a subtle glow trail, monospaced timecode, larger touch targets.
- **Badges** ("BIGGEST MOMENT", "LATE DRAMA", etc.): mono uppercase, hairline outline in lime, no fill — feels like a UI you'd find in a pro broadcast tool, not a content app.
- **Bottom nav**: same hairline language, active tab marked with a 2px lime underline rather than a filled pill.
- **Motion**: keep framer-motion but reduce to two signature moments — hero enter (score counts up, badge slides in) and play-state transition (lime glow ramps). No micro-interactions everywhere.

### Files touched
- `src/styles.css` — full token rewrite + `@theme inline` mapping.
- `src/routes/__root.tsx` — font `<link>` tags, favicon/apple-touch-icon/theme-color, manifest theme color.
- `public/manifest.webmanifest` — point to new icons, update `theme_color` and `background_color`.
- Replace `public/icon-192.png` / `public/icon-512.png` via lovable-assets pipeline (or regenerated from uploaded logo).
- `src/components/BottomNav.tsx`, `MiniPlayer.tsx`, `ExpandedPlayer.tsx`, `AudioCard.tsx`, `EpisodeListItem.tsx` — token swaps, badge restyle, header insertion.
- New `src/components/AppHeader.tsx` — wordmark + hairline.
- New `src/components/Wordmark.tsx` and `src/components/LogoMark.tsx` — pulling from the asset pointers.

No data, server-function, or schema changes.

---

## Part 2 — Documentation suite (`/docs`)

A `/docs` folder at the repo root, each file written *for* an AI agent operating in that role on this codebase. Every doc cross-links to the others and to the relevant source files.

```
docs/
  README.md                  ← index + how to use these docs
  00-product.md              ← vision, target user, value prop, success metrics
  01-brand.md                ← logo usage, palette tokens, type, voice & tone, do/don't
  02-developer.md            ← stack, file map, conventions, run/build, gotchas
  03-architecture.md         ← data flow, server fns, cron, push, AI pipeline diagrams
  04-data-model.md           ← every table, column, RLS policy, realtime channel
  05-content-safety.md       ← system prompt, banned terms, retry policy, AI disclosure
  06-ops.md                  ← runbooks: cron failing, TTS failing, push fanout, rotating secrets, restoring storage
  07-marketing.md            ← positioning, channels, launch checklist, copy bank, SEO/OG strategy
  08-sales.md                ← (free-for-now context) future monetization options, partnership angles, what to say to rights-holders
  09-growth.md               ← referral loops, retention levers, push opt-in playbook, Plausible event taxonomy
  10-support.md              ← common user issues, FAQ source-of-truth, escalation
  11-legal.md                ← AI disclosure stance, data retention, GDPR posture, rights/IP guardrails (no broadcaster impressions, etc.)
  12-roadmap.md              ← what's v1, what's explicitly out, what's next, decision log
  13-agent-handoff.md        ← "if you are an AI agent picking this up cold, start here"
```

### Authoring rules applied to every doc
- Top of each file: **Role**, **When to read this**, **When NOT to read this**.
- Concrete file paths (e.g. `src/lib/api/episode-pipeline.functions.ts:42`) instead of vague references.
- Decision log entries use the format `Decision · Context · Tradeoff · Reversible?`.
- No marketing fluff in dev docs; no implementation details in sales/marketing docs.
- All docs reference the same source-of-truth tables (palette, tokens, table list) by linking to `01-brand.md` / `04-data-model.md` rather than duplicating.

### What gets pulled OUT of the current `README.md`
The root `README.md` shrinks to: one-paragraph "what is this", quickstart, link to `docs/README.md`. Everything else moves into the role-specific files. `.lovable/plan.md` stays as the build artifact; `docs/12-roadmap.md` becomes the living version.

---

## Out of scope for this plan
- Generating a custom OG share image (separate small task once brand lands).
- Any change to server functions, schema, AI pipeline behavior, or cron.
- Adding new product features.

## Order of execution
1. Upload assets to CDN, wire favicon/manifest/wordmark in header.
2. Rewrite `src/styles.css` tokens + load fonts in `__root.tsx`.
3. Restyle header, cards, player, badges, bottom nav using new tokens.
4. Write all 14 docs in parallel.
5. Trim root `README.md` to a pointer.

Reply **go** and I'll execute end-to-end without pausing.