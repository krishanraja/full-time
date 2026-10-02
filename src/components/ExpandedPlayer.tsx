import { motion } from "framer-motion";
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMemo } from "react";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";

function bars(seed: string, n = 56) {
  const out: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(0.18 + ((h % 1000) / 1000) * 0.82);
  }
  return out;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExpandedPlayer({ onClose }: { onClose: () => void }) {
  const { episode, isPlaying, progress, status, error, playbackRate } = usePlayer();
  const wave = useMemo(() => bars(episode?.id ?? "x"), [episode?.id]);
  if (!episode) return null;

  const elapsed = progress * episode.durationSec;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 32 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background px-5"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <div className="flex items-center justify-between">
        <HapticButton
          hapticPattern="soft"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
          aria-label="Close"
        >
          <ChevronDown className="h-5 w-5" />
        </HapticButton>
        <div className="text-[12px] font-semibold tracking-[0.07em] text-ink-2">NOW PLAYING</div>
        <div className="h-11 w-11" />
      </div>

      {/* Sizes follow the height, so a 548px screen fits; overflow-hidden
          is the backstop that keeps text from painting under the controls. */}
      <div className="mt-[clamp(8px,calc(9dvh-30px),48px)] min-h-0 overflow-hidden">
        <div className="text-[14px] font-semibold text-ink-2">{episode.competition}</div>
        {/* The match first, the same as Today. An AI Pundit edition used to
            show only "{pundit} edition" and a model-written headline. */}
        {(episode.format !== "daily" || episode.matchLabel) && (
          <>
            <div className="mt-[clamp(6px,1.5dvh,12px)] flex items-baseline gap-3">
              <div className="serif text-[clamp(44px,9dvh,72px)] leading-none [font-variant-numeric:lining-nums]">
                {episode.homeScore}
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">{episode.awayScore}</span>
              </div>
            </div>
            <div className="serif mt-[clamp(6px,1.5dvh,12px)] text-[clamp(18px,3.6dvh,26px)] leading-tight">
              {episode.homeTeam} <span className="text-ink-2">v</span> {episode.awayTeam}
            </div>
          </>
        )}
        {episode.format === "daily" ? (
          <div className="serif mt-[clamp(8px,2dvh,20px)] text-[clamp(17px,3.4dvh,24px)] italic text-ink-2">
            {episode.punditName}
          </div>
        ) : (
          <>
            <div className="mt-6 line-clamp-2 text-2xl font-semibold leading-tight tracking-tight">
              {episode.title}
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {episode.hook}
            </p>
          </>
        )}
      </div>

      <div className="mt-auto shrink-0">
        <div className="flex h-[clamp(48px,10dvh,80px)] items-end justify-between gap-[3px]">
          {wave.map((v, i) => {
            const passed = i / wave.length < progress;
            return (
              <div
                key={i}
                style={{
                  height: `${v * 100}%`,
                }}
                className={
                  "w-[3px] rounded-full transition-colors " +
                  (passed ? "bg-[var(--lime)]" : "bg-white/12")
                }
              />
            );
          })}
        </div>

        <div className="mt-3 flex justify-between text-[12px] text-ink-2">
          <span className="tabular-nums">{fmt(elapsed)}</span>
          <span className="tabular-nums">−{fmt(Math.max(0, episode.durationSec - elapsed))}</span>
        </div>

        <div className="mt-[clamp(16px,4dvh,32px)] flex items-center justify-center gap-10">
          <HapticButton
            hapticPattern="swipe"
            onClick={() => playerStore.skip(-15)}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--pitch-line)]"
            aria-label="Back 15 seconds"
          >
            <SkipBack className="h-5 w-5" fill="currentColor" />
          </HapticButton>
          <HapticButton
            onClick={() => playerStore.toggle()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-[clamp(60px,12dvh,80px)] w-[clamp(60px,12dvh,80px)] place-items-center rounded-full bg-[var(--lime)] text-[var(--primary-foreground)]"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8 translate-x-[2px]" fill="currentColor" />
            )}
          </HapticButton>
          <HapticButton
            hapticPattern="swipe"
            onClick={() => playerStore.skip(15)}
            className="grid h-12 w-12 place-items-center rounded-full border border-[var(--pitch-line)]"
            aria-label="Forward 15 seconds"
          >
            <SkipForward className="h-5 w-5" fill="currentColor" />
          </HapticButton>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => playerStore.setPlaybackRate(rate)}
              aria-pressed={playbackRate === rate}
              className={
                "min-h-11 min-w-11 rounded-full border px-2.5 text-[12px] tabular-nums " +
                (playbackRate === rate
                  ? "border-foreground text-foreground"
                  : "border-[var(--pitch-line)] text-ink-2")
              }
            >
              {rate}x
            </button>
          ))}
        </div>

        {status === "error" && error && (
          <p role="alert" className="mt-4 text-center text-xs text-[color:#ff8a8a]">
            {error}
          </p>
        )}

        <div className="mt-[clamp(12px,3dvh,32px)] text-center text-[12px] text-ink-3">
          AI-narrated · Full Time
        </div>
      </div>
    </motion.div>
  );
}
