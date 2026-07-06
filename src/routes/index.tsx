import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play } from "lucide-react";
import { AudioCard } from "../components/AudioCard";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { HapticButton } from "../components/HapticButton";
import { useAuth } from "../hooks/use-auth";
import { useTodayFeed } from "../hooks/use-episodes";
import { useFollowed } from "../lib/follow-store";
import { playerStore } from "../lib/player-store";
import { getWaitlistStatus, type WaitlistStatus } from "@/lib/api/waitlist.functions";
import type { Episode } from "../data/mockEpisodes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today • Full Time" },
      {
        name: "description",
        content: "Today's biggest football story, narrated. Tap once and listen.",
      },
      { property: "og:title", content: "Today • Full Time" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Skeleton() {
  return (
    <div className="pb-6 pt-4">
      <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
      <div className="mt-3 h-10 w-56 animate-pulse rounded bg-white/5" />
      <div className="mt-6 h-[300px] animate-pulse rounded-3xl bg-card" />
      <div className="mt-6 flex gap-3">
        <div className="h-40 w-[78%] shrink-0 animate-pulse rounded-3xl bg-card" />
      </div>
    </div>
  );
}

function Home() {
  const { data, isLoading } = useTodayFeed();
  const { user } = useAuth();
  const fetchWaitlist = useServerFn(getWaitlistStatus);
  const waitlist = useQuery<WaitlistStatus>({
    queryKey: ["waitlist", user?.id ?? "anon"],
    queryFn: () => fetchWaitlist(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const followed = useFollowed();
  const rawEpisodes = (data?.episodes ?? []) as Episode[];
  // Club-first: a followed team's (or league's) recap leads the drop. Stable
  // sort keeps published order within each group. No auth needed (follows are
  // local-first). This is the "your clubs first" promise, kept.
  const episodes = useMemo(() => {
    if (!followed.size) return rawEpisodes;
    const isFollowed = (ep: Episode) =>
      (ep.homeTeamId != null && followed.has(`team:${ep.homeTeamId}`)) ||
      (ep.awayTeamId != null && followed.has(`team:${ep.awayTeamId}`)) ||
      (ep.leagueId != null && followed.has(`league:${ep.leagueId}`));
    return [...rawEpisodes].sort((a, b) => Number(isFollowed(b)) - Number(isFollowed(a)));
  }, [rawEpisodes, followed]);

  if (isLoading || !data) return <Skeleton />;
  const { tonight, coda } = data as typeof data & { coda: string | null };

  return (
    <div className="pb-6 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="eyebrow">Today · {todayLabel()}</div>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-tight">
          The morning drop.
        </h1>
        <p className="mt-2 max-w-[28ch] text-sm leading-snug text-muted-foreground">
          Yesterday's biggest stories from the Big Five, narrated in 60-second cuts.
        </p>
      </motion.div>

      {episodes.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No recaps yet. Check back after tomorrow's drop at 7am.
        </p>
      ) : (
        <>
          <HapticButton
            hapticPattern="success"
            onClick={() => playerStore.playAll(episodes)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-transform active:scale-[0.99]"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Play the morning · {episodes.length} {episodes.length === 1 ? "recap" : "recaps"}
          </HapticButton>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="mt-4"
          >
            <AudioCard episode={episodes[0] as Episode} hero queue={episodes} />
          </motion.div>

          {episodes.length > 1 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="eyebrow">Today's recaps</div>
                <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {episodes.length - 1} more
                </span>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                {episodes.slice(1).map((ep) => (
                  <div key={ep.id} className="w-[80%] shrink-0 snap-start">
                    <AudioCard episode={ep} queue={episodes} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {coda && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="surface mt-8 rounded-[var(--radius-2xl)] p-5"
        >
          <div className="eyebrow mb-2">One thing we noticed</div>
          <p className="text-[15px] leading-relaxed text-foreground">{coda}</p>
          <div className="text-mono mt-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            While you were asleep · spotted across every match
          </div>
        </motion.section>
      )}

      {!waitlist.data?.joined && (
        <Link
          to="/waitlist"
          className="surface mt-8 flex items-center justify-between rounded-[var(--radius-lg)] p-4"
        >
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Want this every morning?
            </div>
            <div className="text-mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Every matchday · live by 7am · join the waitlist
            </div>
          </div>
          <span className="text-sm font-semibold text-[var(--lime)]">Go →</span>
        </Link>
      )}

      {tonight.length > 0 && (
        <section className="mt-8">
          <div className="eyebrow mb-3">Tonight</div>
          <ul className="flex flex-col">
            {tonight.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center justify-between border-b border-[var(--pitch-line)] py-3 last:border-b-0"
                style={i === 0 ? { borderTop: "1px solid var(--pitch-line)" } : undefined}
              >
                <span className="text-sm font-semibold tracking-tight">{t.label}</span>
                <span className="text-mono text-xs uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                  {t.kickoff}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {episodes.length > 1 && (
        <section className="mt-8">
          <div className="eyebrow mb-3">Up next in the feed</div>
          <div className="flex flex-col gap-1">
            {episodes.slice(1, 3).map((ep) => (
              <EpisodeListItem key={ep.id} episode={ep} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
