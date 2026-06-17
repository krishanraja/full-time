import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListMusic, Heart, Settings as Cog } from "lucide-react";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/utils";

const ITEMS = [
  { to: "/", label: "Today", Icon: Home },
  { to: "/feed", label: "Feed", Icon: ListMusic },
  { to: "/following", label: "Following", Icon: Heart },
  { to: "/settings", label: "Settings", Icon: Cog },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 backdrop-blur-xl"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        background:
          "linear-gradient(to top, color-mix(in oklab, var(--background) 96%, transparent), color-mix(in oklab, var(--background) 70%, transparent))",
        borderTop: "1px solid var(--pitch-line)",
      }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="relative">
              <Link
                to={to}
                onClick={() => haptic("tap")}
                className={cn(
                  "tap relative flex flex-col items-center gap-1 py-2.5 text-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
                {active && (
                  <span
                    className="absolute -top-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[var(--lime)]"
                    style={{ boxShadow: "0 0 10px var(--lime)" }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
