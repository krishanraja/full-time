import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play } from "lucide-react";
import type { Episode } from "../data/mockEpisodes";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioCard({
  episode,
  hero = false,
  queue,
}: {
  episode: Episode;
  hero?: boolean;
  /** The drop to play through when this card starts. Enables continuous playback. */
  queue?: Episode[];
}) {
  const { episode: current, isPlaying, progress } = usePlayer();
  const active = current?.id === episode.id;
  const playing = active && isPlaying;

  return (
    <motion.div
      layout
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={cn(
        "surface relative overflow-hidden rounded-[var(--radius-2xl)] p-5 transition-shadow",
        hero && "min-h-[260px] p-6",
        playing && "glow-lime",
      )}
      style={
        playing
          ? { borderColor: "color-mix(in oklab, var(--lime) 45%, var(--pitch-line))" }
          : undefined
      }
    >
      {/* corner ticker */}
      <div className="flex items-center justify-between">
        <div className="text-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{episode.competition}</span>
          <span className="opacity-40">/</span>
          <span>{fmt(episode.durationSec)}</span>
        </div>
        {episode.badge && (
          <div className="text-mono inline-flex items-center rounded-sm border border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.22em] text-[var(--lime)]">
            {episode.badge}
          </div>
        )}
      </div>

      {/* score block — the visual anchor */}
      <div className={cn("mt-5 flex items-end gap-4", hero ? "mt-7" : "mt-5")}>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate font-semibold tracking-tight",
              hero ? "text-base" : "text-sm",
            )}
          >
            {episode.homeTeam}
          </div>
          <div
            className={cn(
              "mt-0.5 truncate font-semibold tracking-tight text-muted-foreground",
              hero ? "text-base" : "text-sm",
            )}
          >
            {episode.awayTeam}
          </div>
        </div>
        <div
          className={cn(
            "text-mono flex shrink-0 items-baseline gap-1 leading-none tabular-nums",
            hero ? "text-[44px]" : "text-3xl",
          )}
        >
          <span>{episode.homeScore}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground">{episode.awayScore}</span>
        </div>
      </div>

      {/* divider */}
      <div className="mt-5 h-px bg-[var(--pitch-line)]" />

      <h2
        className={cn(
          "mt-4 font-semibold leading-tight tracking-tight",
          hero ? "text-xl" : "text-base",
        )}
      >
        {episode.title}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
        {episode.hook}
      </p>

      {/* transport */}
      <div className="mt-5 flex items-center gap-4">
        <HapticButton
          onClick={() => (active ? playerStore.toggle() : playerStore.play(episode, queue ?? [episode]))}
          aria-label={playing ? "Pause" : "Play"}
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--lime)] text-[var(--primary-foreground)] transition-transform active:scale-95",
            playing && "glow-lime",
          )}
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
                <Pause className="h-5 w-5" fill="currentColor" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
              </motion.span>
            )}
          </AnimatePresence>
        </HapticButton>

        <div className="flex-1">
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-[var(--lime)]"
              style={{ boxShadow: playing ? "0 0 12px var(--lime)" : undefined }}
              animate={{ width: `${(active ? progress : 0) * 100}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </div>
          <div className="text-mono mt-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>{fmt(active ? progress * episode.durationSec : 0)}</span>
            <span className="opacity-60">AI · {fmt(episode.durationSec)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
