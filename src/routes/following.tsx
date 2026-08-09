import { createFileRoute } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FollowButton } from "../components/FollowButton";
import { useFollowed, useFollowSync } from "../lib/follow-store";
import { getTeamsAndLeagues } from "../lib/api/feed.functions";

export const Route = createFileRoute("/following")({
  head: () =>
    pageSeo({
      path: "/following",
      title: "Following • Full Time",
      description: "Pick the teams and leagues you actually care about.",
      noindex: true,
    }),
  component: Following,
});

function Following() {
  useFollowSync();
  const followed = useFollowed();
  const hasFollows = followed.size > 0;
  const fetchTL = useServerFn(getTeamsAndLeagues);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teams-leagues"],
    queryFn: () => fetchTL(),
    staleTime: 5 * 60_000,
  });
  const teams = data?.teams ?? [];
  const leagues = data?.leagues ?? [];

  return (
    <div className="pb-6 pt-4">
      <div className="eyebrow">Following</div>
      <h1 className="mb-2 mt-2 text-[30px] font-semibold leading-tight tracking-tight">
        Your teams.
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {hasFollows
          ? `You follow ${followed.size} ${followed.size === 1 ? "team" : "teams"}.`
          : "Pick at least 3 teams to personalise your feed."}
      </p>

      {!hasFollows && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[var(--radius-lg)] border border-dashed border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_6%,transparent)] p-4 text-sm"
        >
          Tap any team below. Your morning recap will lead with their match.
        </motion.div>
      )}

      {isLoading && (
        <div className="surface rounded-[var(--radius-lg)] p-4 text-sm text-muted-foreground">
          Loading the current teams and leagues&hellip;
        </div>
      )}

      {isError && (
        <div className="surface rounded-[var(--radius-lg)] p-4 text-sm">
          <p>Teams could not be loaded.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 font-semibold text-[var(--lime)]"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && teams.length === 0 && leagues.length === 0 && (
        <div className="surface rounded-[var(--radius-lg)] p-4 text-sm text-muted-foreground">
          No current competitions are available yet.
        </div>
      )}

      {!isLoading && !isError && (
        <section className="mb-7">
          <h2 className="eyebrow mb-3">Teams</h2>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <FollowButton key={t.id} id={`team:${t.id}`} label={t.name} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && !isError && (
        <section>
          <h2 className="eyebrow mb-3">Leagues</h2>
          <div className="flex flex-wrap gap-2">
            {leagues.map((l) => (
              <FollowButton key={l.id} id={`league:${l.id}`} label={l.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
