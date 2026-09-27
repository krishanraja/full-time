// Google Analytics (gtag.js). Page views and traffic sources only: product
// events still go through `lib/analytics.ts` to PostHog, so nothing here
// changes what a `track()` call does.
//
// Two surfaces render a document and both carry the tag: the app shell in
// `routes/__root.tsx` (every route) and the plain-HTML error page in
// `lib/error-page.ts`. They read the ID and init snippet from here so the two
// cannot drift. The measurement ID is public by design; it ships in page
// markup the same way the PostHog project key does.
//
// SPA route changes need no extra code. GA4's enhanced measurement records a
// page view on each history change, which is how TanStack Router navigates.

export const GOOGLE_TAG_ID = "G-W2QL8RKFJ1";

export const GOOGLE_TAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`;

export const GOOGLE_TAG_INIT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');`;

// The snippet exactly as Google issues it, for pages rendered as a string.
export const GOOGLE_TAG_HTML = `<!-- Google tag (gtag.js) -->
<script async src="${GOOGLE_TAG_SRC}"></script>
<script>
${GOOGLE_TAG_INIT}
</script>`;
