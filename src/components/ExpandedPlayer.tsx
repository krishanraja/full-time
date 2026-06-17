import { motion } from "framer-motion";
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMemo } from "react";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";

// Deterministic "waveform" bars from the episode id so SSR matches client.
function bars(seed: string, n = 48) {
  const out: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(0.2 + ((h % 1000) / 1000) * 0.8);
  }
  return out;
}

export function ExpandedPlayer({ onClose }: { onClose: () => void }) {
  const { episode, isPlaying, progress } = usePlayer();
  const wave = useMemo(() => bars(episode?.id ?? "x"), [episode?.id]);
  if (!episode) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 32 }}
      className="fixed inset-0 z-50 flex flex-col bg-background px-5 pb-10 pt-4"
    >
      <HapticButton
        hapticPattern="soft"
        onClick={onClose}
        className="mx-auto mb-6 grid h-10 w-10 place-items-center rounded-full bg-white/5"
        aria-label="Close"
      >
        <ChevronDown className="h-5 w-5" />
      </HapticButton>

      <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Now playing
      </div>
      <div className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
        {episode.title}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {episode.homeTeam} {episode.homeScore}–{episode.awayScore} {episode.awayTeam} •{" "}
        {episode.competition}
      </div>

      <p className="mt-6 text-base leading-relaxed text-foreground/90">{episode.hook}</p>

      <div className="mt-auto">
        <div className="flex h-24 items-end justify-between gap-[3px]">
          {wave.map((v, i) => {
            const passed = i / wave.length < progress;
            return (
              <div
                key={i}
                style={{ height: `${v * 100}%` }}
                className={
                  "w-1 rounded-full transition-colors " +
                  (passed ? "bg-primary" : "bg-white/15")
                }
              />
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-8">
          <HapticButton
            hapticPattern="swipe"
            onClick={() => playerStore.seek(Math.max(0, progress - 0.1))}
            className="grid h-12 w-12 place-items-center rounded-full bg-white/5"
            aria-label="Back"
          >
            <SkipBack className="h-5 w-5" fill="currentColor" />
          </HapticButton>
          <HapticButton
            onClick={() => playerStore.toggle()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_50px_-12px_oklch(0.85_0.22_135/0.6)]"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8 translate-x-[2px]" fill="currentColor" />
            )}
          </HapticButton>
          <HapticButton
            hapticPattern="swipe"
            onClick={() => playerStore.seek(Math.min(1, progress + 0.1))}
            className="grid h-12 w-12 place-items-center rounded-full bg-white/5"
            aria-label="Forward"
          >
            <SkipForward className="h-5 w-5" fill="currentColor" />
          </HapticButton>
        </div>
      </div>
    </motion.div>
  );
}
