import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/**
 * Persistent app shell header, the first row of the one-screen frame.
 * - Brand mark (public app icon, served from /icon-192.png so it works on any host) + wordmark top-left.
 * - A single lime hairline anchors the bottom edge.
 * - Honors the top safe-area inset.
 *
 * It used to carry a hard-coded "Pre-launch" status chip that read no flag
 * and stayed on screen for weeks after the founder launch override on
 * 2026-09-04. It said something false and cost a row of attention, so it
 * went rather than being corrected to "Beta".
 */
export function AppHeader() {
  return (
    <header
      className="z-30 shrink-0"
      style={{
        background: "color-mix(in oklab, var(--background) 94%, transparent)",
        paddingTop: "max(env(safe-area-inset-top), 6px)",
      }}
    >
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-4">
        <Link to="/" aria-label="Full Time home" className="tap inline-flex items-center gap-2">
          <img src="/icon-192.png" alt="" aria-hidden className="h-7 w-7" draggable={false} />
          <Wordmark className="h-[20px] w-auto" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {[
            ["/", "Today"],
            ["/following", "Teams"],
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
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] to-transparent" />
    </header>
  );
}
