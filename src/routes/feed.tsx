import { createFileRoute } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { useTodayFeed } from "../hooks/use-episodes";

export const Route = createFileRoute("/feed")({
  head: () =>
    pageSeo({
      path: "/feed",
      title: "Feed • Full Time",
      description: "Every approved recap from the current coverage date in one tap-and-go list.",
    }),
  component: Feed,
});

function Feed() {
  const { data, isLoading } = useTodayFeed();
  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Feed</div>
      <h1 className="mb-6 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        The current approved drop.
      </h1>
      {isLoading || !data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-card/60" />
          ))}
        </div>
      ) : data.episodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recap has passed the current editorial and audio gates.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {data.episodes.map((ep) => (
            <EpisodeListItem key={ep.id} episode={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
