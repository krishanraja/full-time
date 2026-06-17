import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play } from "lucide-react";
import type { Episode } from "../data/mockEpisodes";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioCard({ episode, hero = false }: { episode: Episode; hero?: boolean }) {
  const { episode: current, isPlaying, progress } = usePlayer();
  const active = current?.id === episode.id;
  const playing = active && isPlaying;

  return (
    <motion.div
      layout
      animate={{ scale: active ? 1.0 : 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={
        "relative overflow-hidden rounded-3xl border border-white/5 bg-card p-5 " +
        (hero ? "min-h-[260px]" : "")
      }
    >
      {episode.badge && (
        <div className="mb-3 inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-primary">
          {episode.badge}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">{episode.competition}</span>
        <span>•</span>
        <span>{fmt(episode.durationSec)}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2 text-2xl font-bold tracking-tight">
        <span>{episode.homeTeam}</span>
        <span className="text-primary tabular-nums">
          {episode.homeScore}–{episode.awayScore}
        </span>
        <span>{episode.awayTeam}</span>
      </div>

      <h2 className={"mt-3 font-bold leading-tight " + (hero ? "text-2xl" : "text-lg")}>
        {episode.title}
      </h2>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{episode.hook}</p>

      <div className="mt-5 flex items-center gap-4">
        <HapticButton
          onClick={() => (active ? playerStore.toggle() : playerStore.play(episode))}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_-8px_oklch(0.85_0.22_135/0.6)]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {playing ? (
              <motion.span
                key="pause"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Pause className="h-6 w-6" fill="currentColor" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
              </motion.span>
            )}
          </AnimatePresence>
        </HapticButton>

        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${(active ? progress : 0) * 100}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{fmt(active ? progress * episode.durationSec : 0)}</span>
            <span>{fmt(episode.durationSec)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
