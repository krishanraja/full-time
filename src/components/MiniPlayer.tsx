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
        className="tap fixed inset-x-3 bottom-[78px] z-40 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-card/95 p-2.5 pl-3 text-left shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur"
      >
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-muted-foreground">{episode.competition}</div>
          <div className="truncate text-sm font-semibold">
            {episode.homeTeam} {episode.homeScore}–{episode.awayScore} {episode.awayTeam}
          </div>
        </div>
        <HapticButton
          onClick={(e) => {
            e.stopPropagation();
            playerStore.toggle();
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
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
