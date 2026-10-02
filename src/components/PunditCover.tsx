import { useMemo, type CSSProperties } from "react";
import { clubColours } from "@/lib/club-colours";
import { COVER_HEIGHT, COVER_WIDTH, PUNDIT_HUES, coverArt } from "@/lib/pundit-cover";
import type { PunditId } from "@/lib/pundit/types";
import { cn } from "@/lib/utils";

export type CoverFixture = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

/** One AI Pundit's cover for one match (`src/lib/pundit-cover.ts`). Without
 *  a fixture it prints the pundit's paper with no goal marks. */
export function PunditCover({
  punditId,
  seed,
  fixture,
  className,
  style,
}: {
  punditId: PunditId;
  /** The drop id, so a show always prints the same cover. */
  seed: string;
  fixture?: CoverFixture | null;
  className?: string;
  style?: CSSProperties;
}) {
  const markup = useMemo(
    () =>
      coverArt(punditId, {
        seed,
        homeGoals: fixture?.homeScore ?? 0,
        awayGoals: fixture?.awayScore ?? 0,
        homeColours: clubColours(fixture?.homeTeam ?? ""),
        awayColours: clubColours(fixture?.awayTeam ?? ""),
      }),
    [punditId, seed, fixture?.homeTeam, fixture?.awayTeam, fixture?.homeScore, fixture?.awayScore],
  );
  return (
    <span
      className={cn("pundit-plate", className)}
      style={{ background: PUNDIT_HUES[punditId], ...style }}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        // Built only from numbers and fixed colours (pundit-cover.ts).
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </span>
  );
}
