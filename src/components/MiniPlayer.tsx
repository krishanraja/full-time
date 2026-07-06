import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";
import { ExpandedPlayer } from "./ExpandedPlayer";

export function MiniPlayer() {
  const { episode, isPlaying, progress } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!episode) return null;

  return (
    <>
      <motion.button
        layout
        onClick={() => setExpanded(true)}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="tap surface fixed inset-x-0 bottom-[78px] z-40 mx-auto flex w-[calc(100%-24px)] max-w-[424px] items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] p-2.5 pl-3 text-left backdrop-blur"
      >
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
          <div
            className="h-full bg-[var(--lime)] transition-[width] duration-200"
            style={{
              width: `${progress * 100}%`,
              boxShadow: isPlaying ? "0 0 8px var(--lime)" : undefined,
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-mono truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {episode.competition} · Now playing
          </div>
          <div className="truncate text-sm font-semibold tracking-tight">
            {episode.homeTeam}{" "}
            <span className="text-mono text-[var(--lime)]">
              {episode.homeScore}-{episode.awayScore}
            </span>{" "}
            {episode.awayTeam}
          </div>
        </div>
        <HapticButton
          onClick={(e) => {
            e.stopPropagation();
            playerStore.toggle();
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--lime)] text-[var(--primary-foreground)]"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
          )}
        </HapticButton>
      </motion.button>

      <AnimatePresence>
        {expanded && <ExpandedPlayer onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </>
  );
}
