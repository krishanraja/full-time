import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";

/**
 * Persistent app shell header.
 * - Wordmark sits top-left on every route.
 * - A single lime hairline anchors the bottom edge.
 * - Frosted backdrop so scrolling content reads through it.
 */
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 -mx-4 mb-1 backdrop-blur"
      style={{
        background:
          "linear-gradient(to bottom, color-mix(in oklab, var(--background) 92%, transparent), color-mix(in oklab, var(--background) 70%, transparent))",
        paddingTop: "max(env(safe-area-inset-top), 10px)",
      }}
    >
      <div className="flex h-[72px] items-center justify-between px-4">
        <Link to="/" aria-label="Full Time — home" className="tap inline-flex items-center">
          <Wordmark className="h-[54px] w-auto select-none opacity-95" />
        </Link>
        <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[var(--lime)] shadow-[0_0_10px_var(--lime)]" />
          <span className="ml-2">Live drop</span>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[color:color-mix(in_oklab,var(--lime)_45%,transparent)] to-transparent" />
    </header>
  );
}
