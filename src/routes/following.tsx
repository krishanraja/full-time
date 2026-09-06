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
      description: "Save the teams and leagues you care about, for when per-team shows arrive.",
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
      {/* This page used to promise a personalised feed led by your team's match.
          It does not do that and nothing here does yet: Full Time publishes one
          featured match a day, chosen by importance, and a follow changes
          nothing about which one. Saying otherwise sends a listener looking for
          a thing that is not there. */}
      <p className="mb-6 text-sm text-muted-foreground">
        {hasFollows
          ? `You follow ${followed.size} ${followed.size === 1 ? "team" : "teams"}.`
          : "Pick the teams you care about. We keep the list for you."}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-[var(--radius-lg)] border border-dashed border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_6%,transparent)] p-4 text-sm"
      >
        Today Full Time covers one featured match a day, chosen by importance,
        and every listener gets the same one. Following is saved for when
        per-team shows arrive; it does not change today&rsquo;s show yet.
      </motion.div>

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
