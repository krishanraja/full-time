import { Link, useRouterState } from "@tanstack/react-router";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";

const ITEMS = [
  { to: "/", label: "Today" },
  { to: "/following", label: "Teams" },
  { to: "/settings", label: "Settings" },
] as const;

/** The tab bar: three words, the current one in cream and underlined.
 *  Text only since 2026-10-02: the icons and the glowing lime bar were part
 *  of what read as a generated template. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    // The last row of the one-screen frame, in normal flow rather than fixed
    // over the content, so nothing needs padding to clear it.
    <nav
      className="relative z-40 shrink-0 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgb(21 17 13 / 90%)",
        borderTop: "1px solid var(--pitch-line)",
      }}
    >
      <ul className="mx-auto grid h-[clamp(50px,7.6dvh,58px)] max-w-md grid-cols-3 px-2">
        {ITEMS.map(({ to, label }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex">
              <Link
                to={to}
                onClick={() => haptic("tap")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap flex min-h-11 flex-1 items-center justify-center text-[14.5px] font-medium tracking-[0.01em] transition-colors",
                  active ? "text-foreground" : "text-ink-3 hover:text-ink-2",
                )}
              >
                <span
                  className={cn(
                    "relative px-0.5 py-1.5",
                    active &&
                      "after:absolute after:inset-x-0 after:bottom-px after:h-0.5 after:rounded-[1px] after:bg-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
