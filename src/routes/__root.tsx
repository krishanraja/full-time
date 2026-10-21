import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { AppHeader } from "../components/AppHeader";
import { SiteFooter } from "../components/CompanyNote";
import { MiniPlayer } from "../components/MiniPlayer";
import { CompletionToast } from "../components/CompletionToast";
import { supabase } from "@/integrations/supabase/client";
import { hasClientSupabaseConfig } from "@/lib/supabase-availability";
import { SITE_URL, DEFAULT_COVER_IMAGE_URL, LOGO_URL, SOCIAL_IMAGE } from "@/lib/site-url";
import { ldJson } from "@/lib/seo";
import { GOOGLE_TAG_INIT, GOOGLE_TAG_SRC } from "@/lib/google-tag";

const SITE_NAME_TITLE = "Full Time - Six AI Pundits, one real football match";
const SITE_DESCRIPTION =
  "Pick an AI Pundit and play a complete football show built from checked match facts.";

// Site-wide schema.org graph: the publisher, the website, and the show.
// Split into three linked nodes because search and answer engines treat the
// Organization as the entity, the WebSite as the searchable surface, and the
// PodcastSeries as the thing an episode belongs to. Emitted once, from the
// root, so every route inherits it.
function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Full Time",
        url: SITE_URL,
        email: "krish@fulltime.fm",
        logo: {
          "@type": "ImageObject",
          url: LOGO_URL,
          width: 512,
          height: 512,
        },
        image: SOCIAL_IMAGE.url,
        // The company note on every scrolling page and in the terms
        // (src/components/CompanyNote.tsx, Ruling Krish 2026-10-19).
        parentOrganization: { "@type": "Organization", name: "Mindmaker LLC" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Full Time",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-GB",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "PodcastSeries",
        "@id": `${SITE_URL}/#podcast`,
        name: "Full Time",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-GB",
        webFeed: `${SITE_URL}/api/public/feed.rss`,
        image: DEFAULT_COVER_IMAGE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

function NotFoundComponent() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">No match here. Try the home feed.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// The router types a boundary error as unknown since 1.170: anything can be
// thrown. Nothing here reads it as an Error, so the type is all that changes.
function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went off-side.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      // The app's umber ground (--ground-2 in styles.css), matching the manifest.
      { name: "theme-color", content: "#15110d" },
      { title: SITE_NAME_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_NAME_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Full Time" },
      { property: "og:locale", content: "en_GB" },
      { property: "og:url", content: SITE_URL },
      // A real 1200x630 card (public/og-card.png, from the brand mark and
      // wordmark by scripts/generate-brand-images.mjs), so the large card is
      // honest: nothing gets centre-cropped. Routes override title,
      // description and URL through pageSeo(); the image is inherited.
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_NAME_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: SOCIAL_IMAGE.url },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: String(SOCIAL_IMAGE.width) },
      { property: "og:image:height", content: String(SOCIAL_IMAGE.height) },
      { property: "og:image:alt", content: SOCIAL_IMAGE.alt },
      { name: "twitter:image", content: SOCIAL_IMAGE.url },
      { name: "twitter:image:alt", content: SOCIAL_IMAGE.alt },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Full Time" },
      // Site-level structured data. Answer engines resolve an entity from
      // this graph, so the three nodes are cross-referenced by @id rather
      // than repeated inline. Every claim here is checkable against a real
      // surface: the feed URL 200s, the logo file exists, the series is the
      // thing the episodes say they are part of.
      ldJson(siteJsonLd()),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // Favicons from scripts/generate-brand-images.mjs. The SVG is the
      // simplified mark on the umber tile, legible on light and dark tabs;
      // the .ico is for browsers and crawlers that ask for /favicon.ico.
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      // Podcast/feed autodiscovery. This is how Apple Podcasts, Spotify and
      // every feed reader find the show from the site alone.
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Full Time - AI Pundit football shows",
        href: `${SITE_URL}/api/public/feed.rss`,
      },
      // The answer hub's Atom feed. Discovery for feed readers and crawlers;
      // the hub itself is deliberately not in the app's navigation.
      {
        rel: "alternate",
        type: "application/atom+xml",
        title: "Answers about Full Time",
        href: `${SITE_URL}/answers/feed.xml`,
      },
    ],
    scripts: [
      {
        // PostHog product analytics. Shared project; the product super-property
        // separates ventures. Publishable client key (safe in page markup).
        children:
          "(function(){var s=document.createElement('script');s.async=true;s.src='https://us-assets.i.posthog.com/static/array.js';s.onload=function(){window.posthog.init('phc_uNKPzXzC9QCgkZo2VcTmpwVTNuKtZpghXdeuA5ciBBaz',{api_host:'https://us.i.posthog.com',person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true});window.posthog.register({product:'full_time'});};document.head.appendChild(s);})();",
      } as unknown as { src: string },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js), top of <head> as Google asks. React 19 still
            emits charset, viewport, preloads and stylesheets ahead of it, so
            in the served HTML it is the first script, not the first tag. Not
            in `head().scripts` beside PostHog: HeadContent emits those after
            every meta tag. */}
        <script async src={GOOGLE_TAG_SRC} />
        <script dangerouslySetInnerHTML={{ __html: GOOGLE_TAG_INIT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const wideLayout = pathname === "/receipts";
  // The answer hub is reading copy, so it gets a comfortable measure.
  const readingLayout = pathname === "/answers" || pathname.startsWith("/answers/");
  // The three tabs fit one screen and never scroll, so they carry no footer.
  const oneScreenTab = pathname === "/" || pathname === "/following" || pathname === "/settings";

  useEffect(() => {
    if (!hasClientSupabaseConfig()) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <CompletionToast />
        {/* One screen, no page scroll. The screen region can still scroll as
            a last resort, for legal text or when a listener zooms in, but no
            tab is allowed to need it at a phone's default size. */}
        <div className="app-frame relative">
          {/* Behind everything: a screen's light (the floodlit match on Today,
              the followed clubs on Teams) draws here, so it reaches the top. */}
          <div
            id="app-backdrop"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
            aria-hidden
          />
          <AppHeader />
          {/* Full width, so a legacy page that does need the last-resort
              scroll scrolls wherever the pointer is; the column sits inside. */}
          <div
            id="screen"
            className="relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain"
          >
            <div
              className={`mx-auto flex w-full flex-1 flex-col px-4 ${
                wideLayout ? "max-w-5xl" : readingLayout ? "max-w-2xl" : "max-w-md"
              }`}
            >
              <Outlet />
              {!oneScreenTab && <SiteFooter />}
            </div>
          </div>
          {pathname !== "/" && <MiniPlayer />}
          <BottomNav />
          <div className="app-grain" aria-hidden />
        </div>
      </QueryClientProvider>
    </MotionConfig>
  );
}
