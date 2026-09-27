import { AnimatePresence } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";
import { ExpandedPlayer } from "./ExpandedPlayer";

/**
 * The show you started, carried onto Teams and Settings. A row of the
 * one-screen frame above the tab bar, not a card floating over content.
 *
 * It appears only once a listener has actually started a show (`started`).
 * Loading an edition (a pundit switch preloads its audio) used to be enough,
 * so Teams showed "AI Pundit show · Now playing" over a show nobody had
 * pressed play on, and named no match.
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

  return (
    <>
      <div className="mx-auto mb-2 w-[calc(100%-24px)] max-w-[424px] shrink-0 md:mb-4">
        <div className="tap surface relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] p-2 pl-3 text-left [@media(max-height:620px)]:p-1.5 [@media(max-height:620px)]:pl-3">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
            <div
              className="h-full bg-[var(--lime)] transition-[width] duration-200"
              style={{
                width: `${progress * 100}%`,
                boxShadow: isPlaying ? "0 0 8px var(--lime)" : undefined,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="tap min-w-0 flex-1 text-left"
            aria-label={`Open player for ${headline}`}
          >
            <div className="text-mono truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {isPlaying ? "Playing" : status === "loading" ? "Loading" : "Paused"}
              {byline ? ` · ${byline}` : ""}
            </div>
            <div className="truncate text-sm font-semibold tracking-tight">{headline}</div>
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
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
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
