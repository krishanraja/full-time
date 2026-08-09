import { Clock3, Pause, Play, Share2, ShieldCheck, Sparkles } from "lucide-react";
import type { Episode } from "../data/mockEpisodes";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";

export function DailyShowCard({ episode, onShare }: { episode: Episode; onShare: () => void }) {
  const player = usePlayer();
  const active = player.episode?.id === episode.id;
  const playing = active && player.isPlaying;
  return (
    <article className="surface relative mt-6 overflow-hidden rounded-[calc(var(--radius-2xl)+4px)] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--lime)] opacity-[0.07] blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="eyebrow">{episode.punditName} edition</div>
          <span className="text-mono rounded-full border border-[color:color-mix(in_oklab,var(--lime)_35%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_7%,transparent)] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[var(--lime)]">
            Approved
          </span>
        </div>
        <h2 className="mt-5 max-w-[18ch] text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[40px]">
          {episode.title}
        </h2>
        <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
          {episode.hook}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pitch-line)] px-2.5 py-1.5">
            <Clock3 className="h-3 w-3" /> 5-8 min
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pitch-line)] px-2.5 py-1.5">
            <ShieldCheck className="h-3 w-3" /> Evidence-linked
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pitch-line)] px-2.5 py-1.5">
            <Sparkles className="h-3 w-3" /> Distinct script
          </span>
        </div>
      </div>
      <div className="relative mt-7 flex items-center gap-3 border-t border-[var(--pitch-line)] pt-6">
        <HapticButton
          hapticPattern="success"
          onClick={() => (active ? playerStore.toggle() : playerStore.play(episode, [episode]))}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4" fill="currentColor" />
          )}
          {playing ? "Pause" : "Play the morning"}
        </HapticButton>
        <HapticButton
          hapticPattern="soft"
          onClick={onShare}
          aria-label="Share this pundit edition"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
        >
          <Share2 className="h-4 w-4" />
        </HapticButton>
      </div>
      {active && player.status === "error" && player.error && (
        <p role="alert" className="mt-3 text-xs text-[color:#ff8a8a]">
          {player.error}
        </p>
      )}
    </article>
  );
}
