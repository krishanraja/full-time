import { useEffect, useMemo, useState, type RefObject } from "react";
import { clubInks } from "@/lib/club-colours";
import { atmosphere } from "@/lib/match-atmosphere";
import { BACKDROP_ID, Backdrop } from "./Backdrop";

type Layout = { width: number; height: number; cx: number; cy: number; radius: number };

/** The floodlit matchday layer behind the seal (`src/lib/match-atmosphere.ts`).
 *
 *  It needs the laid-out size and where the seal sits, so it measures both
 *  and redraws when either changes: rotation, browser chrome, font load, a
 *  new match, or the board section shrinking because a status line wrapped
 *  (which moves the seal without resizing it, so watching the seal alone
 *  missed it). Before it measures, and without JavaScript, the ground is
 *  simply plain. */
export function MatchAtmosphere({
  seed,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  sealRef,
}: {
  seed: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  sealRef: RefObject<HTMLElement | null>;
}) {
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const container = document.getElementById(BACKDROP_ID);
    const seal = sealRef.current;
    if (!container || !seal || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const outer = container.getBoundingClientRect();
      const dial = seal.getBoundingClientRect();
      const height = Math.round(dial.bottom - outer.top + dial.height * 0.45);
      setLayout({
        width: outer.width,
        height,
        cx: dial.left - outer.left + dial.width / 2,
        cy: dial.top - outer.top + dial.height / 2,
        radius: dial.width / 2,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(seal);
    const board = seal.closest("section");
    if (board) observer.observe(board);
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [sealRef, homeTeam, awayTeam]);

  const markup = useMemo(
    () =>
      layout
        ? atmosphere({
            seed,
            homeGoals: homeScore ?? 0,
            awayGoals: awayScore ?? 0,
            home: clubInks(homeTeam),
            away: clubInks(awayTeam),
            ...layout,
          })
        : "",
    [layout, seed, homeTeam, awayTeam, homeScore, awayScore],
  );

  return (
    <Backdrop>
      {layout && (
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="absolute left-0 top-0 block"
          aria-hidden
          focusable="false"
          // Built only from numbers and fixed colours (match-atmosphere.ts).
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      )}
    </Backdrop>
  );
}
