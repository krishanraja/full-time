import { Check } from "lucide-react";
import { useFollowed, useToggleFollow } from "../lib/follow-store";
import { ClubCrest } from "./ClubCrest";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

/**
 * One club on Teams: crest, name, and whether you follow it.
 *
 * The name stays on the button when followed. It used to swap to
 * "Following", which in a grid of twenty left a listener unable to see which
 * clubs they had picked. The state is carried by colour and `aria-pressed`.
 */
export function FollowButton({
  id,
  label,
  crest,
}: {
  id: string;
  label: string;
  crest?: string | null;
}) {
  const followed = useFollowed();
  const toggle = useToggleFollow();
  const on = followed.has(id);
  return (
    <HapticButton
      hapticPattern={on ? "soft" : "double"}
      onClick={() => toggle(id)}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        "relative flex min-h-[clamp(46px,8.2dvh,72px)] w-full flex-col items-center justify-center gap-[clamp(2px,0.6dvh,4px)] rounded-[14px] border px-0.5 py-1 text-center transition-colors",
        on
          ? "border-[color:color-mix(in_oklab,var(--lime)_65%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_12%,transparent)]"
          : "border-[var(--pitch-line)] bg-card hover:border-foreground/30",
      )}
    >
      {on && (
        <span
          className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--lime)] text-[var(--primary-foreground)]"
          aria-hidden
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
        </span>
      )}
      <ClubCrest src={crest} className="h-[clamp(20px,4dvh,30px)] w-[clamp(20px,4dvh,30px)]" />
      <span
        className={cn(
          "line-clamp-2 w-full text-[clamp(10px,2.8vw,12px)] font-semibold leading-[1.1] tracking-[-0.035em] hyphens-auto [overflow-wrap:normal]",
          on ? "text-[var(--lime)]" : "text-foreground",
        )}
      >
        {label}
      </span>
    </HapticButton>
  );
}
