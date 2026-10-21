// Shared page-level SEO/GEO head builder.
//
// Why this exists: every route used to hand-roll its own head() with a
// RELATIVE canonical and og:url ("/archive"). Two things break with that.
// First, og:url is required to be absolute by the Open Graph spec, so share
// unfurls on the relative ones were resolving against the scraper's own
// origin. Second, and worse, this app answers on more than one hostname
// (fulltime.fm plus the retained full-time-*.vercel.app aliases), so a
// relative canonical resolves to whichever host the crawler arrived on and
// therefore cannot consolidate duplicates. An absolute canonical built from
// SITE_URL always names the one true origin.
//
// The robots directive is the GEO half: `max-snippet:-1` and
// `max-image-preview:large` are what let Google AI Overviews and the other
// answer engines quote a full passage rather than a truncated fragment.

import { SITE_URL, SOCIAL_IMAGE } from "./site-url";

// TanStack Router turns a `script:ld+json` entry in the head `meta` array
// into a real <script type="application/ld+json"> in the server-rendered
// <head>. That array is typed as HTML <meta> attributes, which this escape
// hatch deliberately is not, so the cast lives here at the single point of
// use rather than being repeated at every call site.
export function ldJson(data: unknown) {
  return { "script:ld+json": data } as unknown as { name: string; content: string };
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Full-fat indexing permission for public surfaces.
const INDEX_DIRECTIVE =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

// Personalised or account-only surfaces. These are already Disallow-ed in
// robots.txt for the crawlers that honour it; the meta tag is the belt to
// that braces, and it is the only one of the two that some AI crawlers read.
const NOINDEX_DIRECTIVE = "noindex, follow";

type PageSeoInput = {
  /** Route path, leading slash, no origin. */
  path: string;
  title: string;
  description: string;
  /** Absolute image URL. Defaults to the 1200x630 social card. */
  image?: string;
  imageAlt?: string;
  /** Pixel size of a custom image, when known. The default card's is known. */
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
  /** Set for account-only or personalised surfaces. */
  noindex?: boolean;
};

/** Returns the `meta` + `links` head fragment for a route. */
export function pageSeo({
  path,
  title,
  description,
  image = SOCIAL_IMAGE.url,
  imageAlt = SOCIAL_IMAGE.alt,
  imageWidth,
  imageHeight,
  type = "website",
  noindex = false,
}: PageSeoInput) {
  const url = absoluteUrl(path);
  // The root declares the default card's 1200x630. A page with its own image
  // restates the size when it knows it; the pipeline's share cards are also
  // 1200x630 (share-card.server.ts), so the inherited size stays true for them.
  const width = image === SOCIAL_IMAGE.url ? SOCIAL_IMAGE.width : imageWidth;
  const height = image === SOCIAL_IMAGE.url ? SOCIAL_IMAGE.height : imageHeight;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: noindex ? NOINDEX_DIRECTIVE : INDEX_DIRECTIVE },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: imageAlt },
      ...(width && height
        ? [
            { property: "og:image:width", content: String(width) },
            { property: "og:image:height", content: String(height) },
          ]
        : []),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
