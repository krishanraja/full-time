import { createFileRoute } from "@tanstack/react-router";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { useTodayFeed } from "../hooks/use-episodes";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed • Full Time" },
      { name: "description", content: "Every recap from today's matches in one tap-and-go list." },
      { property: "og:title", content: "Feed • Full Time" },
      { property: "og:url", content: "/feed" },
    ],
    links: [{ rel: "canonical", href: "/feed" }],
  }),
  component: Feed,
});

function Feed() {
  const { data, isLoading } = useTodayFeed();
  return (
    <div className="px-4 pb-6 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Feed</div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">All recaps today</h1>
      {isLoading || !data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-card/60" />
          ))}
        </div>
      ) : data.episodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recaps yet today.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.episodes.map((ep) => (
            <EpisodeListItem key={ep.id} episode={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
