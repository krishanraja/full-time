import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/**
 * Persistent app shell header.
 * - Brand mark (public app icon, served from /icon-192.png so it works on any host) + wordmark top-left.
 * - A single lime hairline anchors the bottom edge.
 * - Frosted backdrop so scrolling content reads through it. Honors the top safe-area inset.
 */
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 -mx-4 mb-2 backdrop-blur"
      style={{
        background:
          "linear-gradient(to bottom, color-mix(in oklab, var(--background) 94%, transparent), color-mix(in oklab, var(--background) 72%, transparent))",
        paddingTop: "max(env(safe-area-inset-top), 10px)",
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" aria-label="Full Time home" className="tap inline-flex items-center gap-2">
          <img src="/icon-192.png" alt="" aria-hidden className="h-8 w-8" draggable={false} />
          <Wordmark className="h-[22px] w-auto" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {[
            ["/", "Morning"],
            ["/receipts", "Receipts"],
            ["/following", "Following"],
            ["/settings", "Settings"],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              activeProps={{
                className:
                  "inline-flex min-h-11 items-center rounded-full bg-white/[0.06] px-3 py-2 text-xs font-semibold text-foreground",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Honest, calm status. The product is deliberately the day-after
            moment, not live, so no real-time claim here. */}
        <div className="text-mono inline-flex items-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          <span className="ml-2">Pre-launch</span>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] to-transparent" />
    </header>
  );
}
