import { AnimatePresence } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { PunditCover } from "./PunditCover";

/**
 * The show you started, carried onto Teams and Settings. A row of the
 * one-screen frame above the tab bar, not a card floating over content.
 *
 * It appears only once a listener has actually started a show (`started`).
 * Loading an edition (a pundit switch preloads its audio) used to be enough,
 * so Teams showed "AI Pundit show · Now playing" over a show nobody had
 * pressed play on, and named no match. Its cover is the one the AI Pundit
 * printed for this match on Today.
 */
export function MiniPlayer() {
  const { episode, isPlaying, progress, status, started } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const visible = episode != null && started;
  useEffect(() => {
    if (!visible) setExpanded(false);
  }, [visible]);
  if (!episode || !visible) return null;

  const daily = episode.format === "daily";
  const headline = daily
    ? (episode.matchLabel ?? episode.title)
    : `${episode.homeTeam} ${episode.homeScore}-${episode.awayScore} ${episode.awayTeam}`;
  const byline = daily ? episode.punditName : episode.competition;
  const state = isPlaying ? "PLAYING" : status === "loading" ? "LOADING" : "PAUSED";

  return (
    <>
      <div className="relative z-[1] mx-auto mb-[clamp(8px,1.4dvh,12px)] mt-1 w-[calc(100%-32px)] max-w-[416px] shrink-0">
        <div className="relative flex items-center gap-3 overflow-hidden rounded-[3px] bg-card p-[7px] shadow-[inset_0_0_0_1px_rgba(241,233,218,0.06)]">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
            <div
              className="h-full bg-[var(--lime)] transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="tap flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Open player for ${headline}`}
          >
            {episode.punditId && episode.coverSeed && (
              <span className="relative h-[clamp(44px,6.3dvh,48px)] w-11 shrink-0 rounded-[2px]">
                <PunditCover
                  punditId={episode.punditId}
                  seed={episode.coverSeed}
                  fixture={
                    episode.homeTeam
                      ? {
                          homeTeam: episode.homeTeam,
                          awayTeam: episode.awayTeam,
                          homeScore: episode.homeScore,
                          awayScore: episode.awayScore,
                        }
                      : null
                  }
                />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[11.5px] font-semibold tracking-[0.06em] text-[#b3a690]">
                {state}
                {byline ? ` · ${byline.toUpperCase()}` : ""}
              </span>
              <span className="serif mt-px block truncate text-[18px] leading-[1.1]">
                {headline}
              </span>
            </span>
          </button>
          <HapticButton
            onClick={(e) => {
              e.stopPropagation();
              playerStore.toggle();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--lime)] text-[var(--primary-foreground)]"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" strokeWidth={0} />
            )}
          </HapticButton>
        </div>
      </div>

      <AnimatePresence>
        {expanded && <ExpandedPlayer onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </>
  );
}
