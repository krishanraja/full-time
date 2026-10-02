import { useEffect, useMemo, useState } from "react";
import { clubInks } from "@/lib/club-colours";
import { sealPlate, sealTrack, sealWeave } from "@/lib/match-seal";
import { cn } from "@/lib/utils";

/** The engraved seal around the score (`src/lib/match-seal.ts`).
 *
 *  The plate, the 90-minute track and the numerals render on the server.
 *  The weave, about a hundred kilobytes of path data, is drawn in the
 *  browser after hydration rather than sent in every page. */
export function MatchSeal({
  seed,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  className,
}: {
  seed: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const known = homeScore != null && awayScore != null;
  const weave = useMemo(
    () =>
      mounted
        ? sealWeave({
            seed,
            homeGoals: homeScore ?? 0,
            awayGoals: awayScore ?? 0,
            home: clubInks(homeTeam),
            away: clubInks(awayTeam),
          })
        : "",
    [mounted, seed, homeTeam, awayTeam, homeScore, awayScore],
  );
  const homeLost = known && homeScore! < awayScore!;
  const awayLost = known && awayScore! < homeScore!;
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden>
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full overflow-visible"
        focusable="false"
        // Built only from numbers and fixed colours (match-seal.ts).
        dangerouslySetInnerHTML={{ __html: sealPlate(seed) + weave + sealTrack() }}
      />
      <div className="absolute inset-0 grid grid-cols-2 items-center">
        {[
          { value: homeScore, lost: homeLost, pad: "pl-[12%]" },
          { value: awayScore, lost: awayLost, pad: "pr-[12%]" },
        ].map((side, index) => (
          <span
            key={index}
            className={cn(
              "serif text-center leading-none [font-size:calc(var(--seal)*0.5)] [font-variant-numeric:lining-nums] [paint-order:stroke_fill] [-webkit-text-stroke:calc(var(--seal)*0.0042)_currentColor]",
              side.pad,
              side.lost ? "text-[#b3a690]" : "text-[#f7f0e4]",
            )}
            style={{ paddingTop: "0.06em" }}
          >
            {side.value ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
