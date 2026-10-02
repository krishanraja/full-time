import { useFollowed, useToggleFollow } from "../lib/follow-store";
import { CrestDisc } from "./CrestDisc";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

/** A ceiling on a label's width in em of Schibsted Grotesk semibold,
 *  measured at up to 0.50em a character across a name and 0.60em inside
 *  one long word. "Crystal Palace" on a 320px phone shrinks a little rather
 *  than spilling past its card. */
function labelEm(label: string) {
  const longest = Math.max(...label.split(/\s+/).map((word) => word.length));
  return Math.max(label.length * 0.505, longest * 0.61);
}

/**
 * One club on Teams: its crest ringed in its colour, its name, and whether
 * you follow it. A followed club becomes a cream card with a tick, and keeps
 * its name (it used to swap to "Following", which hid which clubs you had
 * picked). The state is also carried by `aria-pressed`.
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
        "relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-[clamp(3px,calc(2.2dvh-9px),8px)] px-0.5 pb-1 pt-1.5 text-center [container-type:inline-size]",
        on && "rounded-[2px] bg-[#efe6d6]",
      )}
    >
      {on && (
        <span
          className="absolute right-1.5 top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#16110d]"
          aria-hidden
        >
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5">
            <path
              d="M4 7.2l2 2 4-4.4"
              fill="none"
              stroke="#F1E9DA"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      <CrestDisc
        club={label}
        crest={crest}
        ringWidth={2}
        plain={on}
        className="h-[clamp(28px,5.1dvh,40px)] w-[clamp(28px,5.1dvh,40px)] [--ring-gap:1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.22)]"
      />
      <span
        className={cn(
          "w-full whitespace-nowrap leading-[1.15] tracking-[0.005em]",
          on ? "font-semibold text-[#1c1611]" : "font-medium text-ink-2",
        )}
        style={{
          fontSize: `min(clamp(10.5px, 1.65dvh, 12.5px), calc(100cqi / ${labelEm(label).toFixed(2)}))`,
        }}
      >
        {label}
      </span>
    </HapticButton>
  );
}
