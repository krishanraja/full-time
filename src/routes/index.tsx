import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AudioCard } from "../components/AudioCard";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { useTodayFeed } from "../hooks/use-episodes";
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
  if (isLoading || !data) return <Skeleton />;
  const { episodes, tonight } = data;

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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="mt-6"
          >
            <AudioCard episode={episodes[0] as Episode} hero />
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
                    <AudioCard episode={ep} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
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
