import { Play, Pause } from "lucide-react";
import type { Episode } from "../data/mockEpisodes";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

export function EpisodeListItem({ episode }: { episode: Episode }) {
  const { episode: current, isPlaying } = usePlayer();
  const active = current?.id === episode.id;
  const playing = active && isPlaying;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[var(--radius-lg)] border border-transparent p-3 transition-colors",
        active ? "border-[color:color-mix(in_oklab,var(--lime)_35%,var(--pitch-line))] bg-card/80" : "hover:bg-card/40",
      )}
    >
      <HapticButton
        onClick={() => (active ? playerStore.toggle() : playerStore.play(episode))}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--pitch-line)] bg-card text-foreground",
          playing && "border-transparent bg-[var(--lime)] text-[var(--primary-foreground)]",
        )}
      >
        {playing ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
        )}
      </HapticButton>
      <div className="min-w-0 flex-1">
        <div className="text-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{episode.competition}</span>
          <span className="opacity-40">/</span>
          <span className="tabular-nums">
            {Math.floor(episode.durationSec / 60)}:
            {(episode.durationSec % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <div className="truncate text-sm font-semibold tracking-tight">
          {episode.homeTeam}{" "}
          <span className="text-mono text-[var(--lime)] tabular-nums">
            {episode.homeScore}–{episode.awayScore}
          </span>{" "}
          {episode.awayTeam}
        </div>
        <div className="truncate text-xs text-muted-foreground">{episode.title}</div>
      </div>
    </div>
  );
}
