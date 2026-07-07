import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Play, Pause, Sparkle } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/use-auth";
import { playerStore, usePlayer } from "../lib/player-store";
import {
  getArchive,
  getArchiveOverview,
  requestEpisode,
  DAILY_GENERATION_LIMIT,
  type ArchiveData,
  type ArchiveMatch,
} from "@/lib/api/archive.functions";
import type { Episode } from "../data/mockEpisodes";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive • Full Time" },
      {
        name: "description",
        content: "Name a game. Any match we hold the data for, narrated on demand.",
      },
      { property: "og:title", content: "Archive • Full Time" },
      { property: "og:url", content: "/archive" },
    ],
    links: [{ rel: "canonical", href: "/archive" }],
  }),
  component: ArchivePage,
});

function track(event: string, props?: Record<string, string>) {
  const plausible = (window as unknown as { plausible?: (e: string, o?: { props: Record<string, string> }) => void })
    .plausible;
  if (typeof plausible === "function") plausible(event, props ? { props } : undefined);
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  if (authLoading) return <div className="pb-6 pt-4"><div className="h-4 w-32 animate-pulse rounded bg-white/5" /></div>;
  return user ? <ArchiveSignedIn /> : <ArchiveLocked />;
}

// Signed out: honest teaser, one ask. No dead end.
function ArchiveLocked() {
  const fetchOverview = useServerFn(getArchiveOverview);
  const overview = useQuery({ queryKey: ["archive-overview"], queryFn: () => fetchOverview() });

  useEffect(() => {
    track("signin_gate_shown", { surface: "archive" });
  }, []);

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Archive</div>
      <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Name a game.
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Any match we hold the data for, narrated on demand in the Full Time voice, checked
        against the facts before you hear it.
      </p>

      <div className="surface mt-6 rounded-[var(--radius-lg)] p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold tracking-tight">Free account</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {overview.data
            ? `${overview.data.finishedMatches} matches in the vault, ${overview.data.narrated} already narrated. `
            : ""}
          Sign in free to browse the archive and narrate {DAILY_GENERATION_LIMIT} games a day.
        </p>
        <Link
          to="/auth"
          search={{ redirect: "/archive" }}
          className="glow-lime mt-4 flex w-full items-center justify-center rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90"
        >
          Sign in free
        </Link>
      </div>
      <div className="mt-6 text-center">
        <Link to="/" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          Back to today&rsquo;s drop
        </Link>
      </div>
    </div>
  );
}

function ArchiveSignedIn() {
  const queryClient = useQueryClient();
  const fetchArchive = useServerFn(getArchive);
  const generate = useServerFn(requestEpisode);
  const archive = useQuery<ArchiveData>({ queryKey: ["archive"], queryFn: () => fetchArchive() });

  const [league, setLeague] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const matches = archive.data?.matches ?? [];
  const leagues = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of matches) if (m.leagueId && !seen.has(m.leagueId)) seen.set(m.leagueId, m.competition);
    return [...seen.entries()];
  }, [matches]);
  const shown = league ? matches.filter((m) => m.leagueId === league) : matches;
  const remaining = archive.data?.remainingToday ?? 0;

  const handleGenerate = async (m: ArchiveMatch) => {
    if (generating) return;
    setErr(null);
    setGenerating(m.matchId);
    try {
      const { episode, remainingToday } = await generate({ data: { matchId: m.matchId } });
      track("name_a_game", { generated: "true" });
      queryClient.setQueryData<ArchiveData>(["archive"], (old) =>
        old
          ? {
              remainingToday,
              matches: old.matches.map((x) =>
                x.matchId === m.matchId ? { ...x, episode, generatable: false } : x,
              ),
            }
          : old,
      );
      playerStore.play(episode as unknown as Episode);
    } catch (e) {
      track("name_a_game", { generated: "false" });
      setErr(e instanceof Error ? e.message : "Could not narrate this one. Try again.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Archive</div>
      <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Name a game.
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Tap play on anything already narrated. Anything else with match data, we narrate on
        the spot, checked against the facts first.
      </p>
      <p className="text-mono mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {remaining} of {DAILY_GENERATION_LIMIT} narrations left today
      </p>

      {leagues.length > 1 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LeagueChip label="All" active={league === null} onClick={() => setLeague(null)} />
          {leagues.map(([id, name]) => (
            <LeagueChip key={id} label={name} active={league === id} onClick={() => setLeague(id)} />
          ))}
        </div>
      )}

      {err && <p className="mt-4 text-xs text-[color:#ff6b6b]">{err}</p>}

      {archive.isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-card" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Nothing in the vault for that filter yet. More matchdays are being loaded.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-1.5">
          {shown.map((m) => (
            <ArchiveRow
              key={m.matchId}
              match={m}
              generating={generating === m.matchId}
              generateDisabled={!!generating || remaining <= 0}
              onGenerate={() => handleGenerate(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <HapticButton
      hapticPattern="soft"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors",
        active
          ? "border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_10%,transparent)] text-foreground"
          : "border-[var(--pitch-line)] text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </HapticButton>
  );
}

function ArchiveRow({
  match,
  generating,
  generateDisabled,
  onGenerate,
}: {
  match: ArchiveMatch;
  generating: boolean;
  generateDisabled: boolean;
  onGenerate: () => void;
}) {
  const { episode: current, isPlaying } = usePlayer();
  const ep = match.episode;
  const active = !!ep && current?.id === ep.id;
  const playing = active && isPlaying;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border border-transparent p-3 transition-colors",
        active ? "border-[color:color-mix(in_oklab,var(--lime)_35%,var(--pitch-line))] bg-card/80" : "hover:bg-card/40",
      )}
    >
      {ep ? (
        <Link to="/episode/$id" params={{ id: ep.id }} className="min-w-0 flex-1">
          <div className="text-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="truncate">{match.competition}</span>
            <span className="opacity-40">/</span>
            <span className="tabular-nums">{dateLabel(match.kickoffAt)}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold tracking-tight">
            {match.homeTeam}{" "}
            <span className="text-mono tabular-nums">
              {match.homeScore}-{match.awayScore}
            </span>{" "}
            <span className="text-muted-foreground">{match.awayTeam}</span>
          </div>
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <div className="text-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="truncate">{match.competition}</span>
            <span className="opacity-40">/</span>
            <span className="tabular-nums">{dateLabel(match.kickoffAt)}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold tracking-tight">
            {match.homeTeam}{" "}
            <span className="text-mono tabular-nums">
              {match.homeScore}-{match.awayScore}
            </span>{" "}
            <span className="text-muted-foreground">{match.awayTeam}</span>
          </div>
        </div>
      )}

      {ep ? (
        <HapticButton
          onClick={() => (active ? playerStore.toggle() : playerStore.play(ep as unknown as Episode))}
          aria-label={playing ? "Pause" : "Play"}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--pitch-line)] bg-card text-foreground",
            playing && "border-transparent bg-[var(--lime)] text-[var(--primary-foreground)]",
          )}
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
          )}
        </HapticButton>
      ) : match.generatable ? (
        <HapticButton
          hapticPattern="success"
          onClick={onGenerate}
          disabled={generateDisabled && !generating}
          aria-label="Narrate this match"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--pitch-line)] px-3 py-2 text-xs font-semibold tracking-tight hover:border-foreground/30",
            generating && "border-[color:color-mix(in_oklab,var(--lime)_45%,transparent)]",
            generateDisabled && !generating && "opacity-40",
          )}
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--lime)]" />
              <span className="text-mono text-[10px] uppercase tracking-[0.14em]">Checking facts…</span>
            </>
          ) : (
            <>
              <Sparkle className="h-3.5 w-3.5 text-[var(--lime)]" />
              Narrate
            </>
          )}
        </HapticButton>
      ) : (
        <span className="text-mono shrink-0 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
          No data yet
        </span>
      )}
    </div>
  );
}
