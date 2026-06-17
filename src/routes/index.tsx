import { createFileRoute } from "@tanstack/react-router";
import { AudioCard } from "../components/AudioCard";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { EPISODES, TONIGHT } from "../data/mockEpisodes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today • GoalBot Radio" },
      {
        name: "description",
        content: "Today's biggest football story, narrated. Tap once and listen.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [hero, ...rest] = EPISODES;
  return (
    <div className="px-4 pb-6 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Today
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">GoalBot Radio</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-card text-sm font-bold">
          ⚽
        </div>
      </header>

      <AudioCard episode={hero} hero />

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

      <section className="mt-7">
        <h2 className="mb-3 text-base font-bold">Tonight</h2>
        <ul className="flex flex-col gap-2">
          {TONIGHT.map((t) => (
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

      <section className="mt-7">
        <h2 className="mb-3 text-base font-bold">Up next in the feed</h2>
        <div className="flex flex-col gap-2">
          {rest.slice(0, 2).map((ep) => (
            <EpisodeListItem key={ep.id} episode={ep} />
          ))}
        </div>
      </section>
    </div>
  );
}
