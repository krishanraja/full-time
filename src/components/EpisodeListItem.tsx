import { Play, Pause } from "lucide-react";
import type { Episode } from "../data/mockEpisodes";
import { playerStore, usePlayer } from "../lib/player-store";
import { HapticButton } from "./HapticButton";

export function EpisodeListItem({ episode }: { episode: Episode }) {
  const { episode: current, isPlaying } = usePlayer();
  const active = current?.id === episode.id;
  const playing = active && isPlaying;

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card/60 p-3 active:bg-card">
      <HapticButton
        onClick={() => (active ? playerStore.toggle() : playerStore.play(episode))}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
      >
        {playing ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
        )}
      </HapticButton>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{episode.competition}</span>
          <span>•</span>
          <span className="tabular-nums">
            {Math.floor(episode.durationSec / 60)}:
            {(episode.durationSec % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <div className="truncate text-sm font-semibold">
          {episode.homeTeam} {episode.homeScore}–{episode.awayScore} {episode.awayTeam}
        </div>
        <div className="truncate text-xs text-muted-foreground">{episode.title}</div>
      </div>
    </div>
  );
}
