import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { MiniPlayer } from "../components/MiniPlayer";
import { CompletionToast } from "../components/CompletionToast";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { name: "theme-color", content: "#0a0a0c" },
      { title: "Full Time - Daily football recaps, narrated" },
      {
        name: "description",
        content: "Daily AI-narrated football recaps. Big 5 leagues, 60 seconds each. Tap once, listen on the move.",
      },
      { property: "og:title", content: "Full Time - Daily football recaps, narrated" },
      {
        property: "og:description",
        content: "Daily AI-narrated football recaps. Big 5 leagues, 60 seconds each.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Full Time" },
      { name: "twitter:card", content: "summary" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Full Time" },
      { name: "twitter:title", content: "Full Time - Daily football recaps, narrated" },
      { name: "description", content: "Listen to daily AI-narrated football goal and match recaps with a simple, mobile-first audio feed." },
      { property: "og:description", content: "Listen to daily AI-narrated football goal and match recaps with a simple, mobile-first audio feed." },
      { name: "twitter:description", content: "Listen to daily AI-narrated football goal and match recaps with a simple, mobile-first audio feed." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/be3e992b-b460-4fc8-ac03-5079bc09c31d/id-preview-16fb946e--909f628d-2539-43c1-a276-809849a2eeb8.lovable.app-1781696715077.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/be3e992b-b460-4fc8-ac03-5079bc09c31d/id-preview-16fb946e--909f628d-2539-43c1-a276-809849a2eeb8.lovable.app-1781696715077.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
    scripts: PLAUSIBLE_DOMAIN
      ? [
          {
            src: "https://plausible.io/js/script.js",
            defer: true,
            "data-domain": PLAUSIBLE_DOMAIN,
          } as unknown as { src: string },
        ]
      : [],
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

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <CompletionToast />
      <div className="mx-auto min-h-screen max-w-md pb-[150px]">
        <Outlet />
      </div>
      <MiniPlayer />
      <BottomNav />
    </QueryClientProvider>
  );
}
