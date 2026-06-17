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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-background/85 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                onClick={() => haptic("tap")}
                className={cn(
                  "tap flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
