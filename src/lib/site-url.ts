// Canonical site origin for absolute URLs (RSS enclosures, OG tags, feed
// self-links). Same fallback pattern already used in billing.functions.ts
// getOrigin(): prefer an explicit APP_URL env var, else the one known
// production domain.
export const SITE_URL = process.env.APP_URL ?? "https://fulltime.fm";

// Square podcast cover art (2000x2000, inside the 1400-3000px Apple and
// Spotify cover spec) used as the RSS channel/item itunes:image. Until
// 2026-10-21 this pointed at /icon-512.png, which was secretly the same
// 2000px file; the icons are now their true sizes, so the cover has its own
// file, byte-identical to the old one. scripts/generate-brand-images.mjs
// writes it. A bespoke podcast cover is a Krish-polish item.
export const DEFAULT_COVER_IMAGE_URL = `${SITE_URL}/podcast-cover.png`;

// The brand logo at a true 512x512, for schema.org Organization.logo.
export const LOGO_URL = `${SITE_URL}/icon-512.png`;

// The 1200x630 Open Graph and X card (public/og-card.png), generated from the
// brand mark and wordmark by scripts/generate-brand-images.mjs. The default
// social image for every page that does not supply its own.
export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/og-card.png`,
  width: 1200,
  height: 630,
  alt: "Full Time: one real match, six AI Pundits. Pick the brain you fancy.",
} as const;
