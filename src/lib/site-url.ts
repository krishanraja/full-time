// Canonical site origin for absolute URLs (RSS enclosures, OG tags, feed
// self-links). Same fallback pattern already used in billing.functions.ts
// getOrigin() and hardcoded in __root.tsx's static og:image: prefer an
// explicit APP_URL env var, else the one known production domain.
export const SITE_URL = process.env.APP_URL ?? "https://full-time-alpha.vercel.app";

// Square app icon (2000x2000, verified >= the 1400-3000px Apple/Spotify
// podcast cover art spec) used as: (a) the RSS channel/item itunes:image,
// (b) the per-episode share page OG image fallback when og_image_url is
// NULL (true for every row today; nothing generates that column yet). A
// bespoke podcast cover is a Krish-polish item, tracked in _STATE.md.
export const DEFAULT_COVER_IMAGE_URL = `${SITE_URL}/icon-512.png`;
