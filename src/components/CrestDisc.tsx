import type { CSSProperties } from "react";
import { ringColour } from "@/lib/club-colours";
import { clubDisplayName } from "@/lib/premier-league";
import { cn } from "@/lib/utils";
import { ClubCrest } from "./ClubCrest";

/** "Man City" → "MC", "Sunderland" → "S". */
function initials(club: string) {
  return clubDisplayName(club)
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** A club's crest on a cream plate, ringed in the club's own colour, so a
 *  dark crest (Spurs, Newcastle) reads on any ground and every club is
 *  recognisable by its colour before its badge. */
export function CrestDisc({
  club,
  crest,
  className,
  ringWidth,
  plain = false,
}: {
  /** The club's name, as stored or as shown. */
  club: string;
  crest?: string | null;
  className?: string;
  ringWidth?: number;
  /** No drop shadow: for a disc on a cream card. */
  plain?: boolean;
}) {
  return (
    <span
      className={cn("crest-disc shrink-0", plain && "!shadow-none", className)}
      style={
        {
          "--ring": ringColour(club),
          ...(ringWidth ? { "--ring-width": `${ringWidth}px` } : {}),
        } as CSSProperties
      }
      aria-hidden
    >
      <ClubCrest
        src={crest}
        className="absolute inset-[19%]"
        fallback={
          // No crest, or it failed to load: the club's initials in dark ink,
          // so the plate is never an empty circle. The inner span sizes to
          // the plate (cqw) rather than to whatever contains the disc.
          <span className="absolute inset-0 grid place-items-center [container-type:inline-size]">
            <span className="serif text-[#2a221b] [font-size:46cqw] leading-none">
              {initials(club)}
            </span>
          </span>
        }
      />
    </span>
  );
}
