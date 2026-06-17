import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FollowButton } from "../components/FollowButton";
import { LEAGUES, TEAMS } from "../data/mockEpisodes";
import { useFollowed } from "../lib/follow-store";

export const Route = createFileRoute("/following")({
  head: () => ({
    meta: [
      { title: "Following • GoalBot Radio" },
      { name: "description", content: "Pick the teams and leagues you actually care about." },
    ],
  }),
  component: Following,
});

function Following() {
  const followed = useFollowed();
  const hasFollows = followed.size > 0;

  return (
    <div className="px-4 pb-6 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        Following
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Your teams</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {hasFollows
          ? `You follow ${followed.size} ${followed.size === 1 ? "team" : "teams"}.`
          : "Pick at least 3 teams to personalise your feed."}
      </p>

      {!hasFollows && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm"
        >
          Tap any team below — your morning recap will lead with their match.
        </motion.div>
      )}

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Teams
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEAMS.map((t) => (
            <FollowButton key={t.id} id={t.id} label={t.name} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Leagues
        </h2>
        <div className="flex flex-wrap gap-2">
          {LEAGUES.map((l) => (
            <FollowButton key={l} id={`league:${l}`} label={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
