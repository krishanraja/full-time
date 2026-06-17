import { createFileRoute } from "@tanstack/react-router";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { EPISODES } from "../data/mockEpisodes";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed • GoalBot Radio" },
      { name: "description", content: "Every recap from today's matches in one tap-and-go list." },
    ],
  }),
  component: Feed,
});

function Feed() {
  return (
    <div className="px-4 pb-6 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Feed</div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">All recaps today</h1>
      <div className="flex flex-col gap-2">
        {EPISODES.map((ep) => (
          <EpisodeListItem key={ep.id} episode={ep} />
        ))}
      </div>
    </div>
  );
}
