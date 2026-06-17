import { createFileRoute } from "@tanstack/react-router";
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

function Skeleton() {
  return (
    <div className="px-4 pb-6 pt-5">
      <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
      <div className="mt-2 h-8 w-40 animate-pulse rounded bg-white/5" />
      <div className="mt-6 h-[260px] animate-pulse rounded-3xl bg-card" />
      <div className="mt-6 flex gap-3">
        <div className="h-32 w-[78%] shrink-0 animate-pulse rounded-3xl bg-card" />
      </div>
    </div>
  );
}

function Home() {
  const { data, isLoading } = useTodayFeed();
  if (isLoading || !data) return <Skeleton />;
  const { episodes, tonight } = data;
  if (episodes.length === 0) {
    return (
      <div className="px-4 pb-6 pt-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Full Time</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          No recaps yet. Check back after tomorrow morning's drop.
        </p>
      </div>
    );
  }

  const hero: Episode = episodes[0];
  const rest: Episode[] = episodes.slice(1);

  return (
    <div className="px-4 pb-6 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Today
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Full Time</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-card text-sm font-bold">
          ⚽
        </div>
      </header>

      <AudioCard episode={hero} hero />

      {rest.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold">Today's goals</h2>
            <span className="text-xs text-muted-foreground">{rest.length} recaps</span>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
            {rest.map((ep) => (
              <div key={ep.id} className="w-[78%] shrink-0 snap-start">
                <AudioCard episode={ep} />
              </div>
            ))}
          </div>
        </section>
      )}

      {tonight.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">Tonight</h2>
          <ul className="flex flex-col gap-2">
            {tonight.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-card/60 px-4 py-3"
              >
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{t.kickoff}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">Up next in the feed</h2>
          <div className="flex flex-col gap-2">
            {rest.slice(0, 2).map((ep) => (
              <EpisodeListItem key={ep.id} episode={ep} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
