import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/**
 * Persistent app shell header, the first row of the one-screen frame.
 * - Brand mark (public app icon, served from /icon-192.png so it works on any host) + wordmark top-left.
 * - Honors the top safe-area inset.
 *
 * It used to carry a hard-coded "Pre-launch" status chip that read no flag
 * and stayed on screen for weeks after the founder launch override on
 * 2026-09-04. It said something false and cost a row of attention, so it
 * went rather than being corrected to "Beta".
 */
export function AppHeader() {
  return (
    // Transparent, so a screen's light in the backdrop reaches the top.
    <header
      className="relative z-30 shrink-0"
      style={{ paddingTop: "max(env(safe-area-inset-top), 6px)" }}
    >
      <div className="mx-auto flex h-[clamp(44px,7.4dvh,52px)] w-full max-w-5xl items-center justify-between px-4">
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
              className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-ink-3 transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-foreground underline decoration-2 underline-offset-[10px]",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
