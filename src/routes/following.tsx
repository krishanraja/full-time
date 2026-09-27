import { createFileRoute } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FollowButton } from "../components/FollowButton";
import { useFollowed, useFollowSync } from "../lib/follow-store";
import { getPremierLeagueClubs } from "../lib/api/feed.functions";

export const Route = createFileRoute("/following")({
  head: () =>
    pageSeo({
      path: "/following",
      title: "Teams • Full Time",
      description: "Save the Premier League clubs you care about, for when per-team shows arrive.",
      noindex: true,
    }),
  component: Following,
});

/**
 * Teams: the twenty Premier League clubs, on one screen.
 *
 * Ruling (Krish, 2026-09-27): Premier League teams only. This page listed
 * 120 clubs from five leagues, from 1. FC Heidenheim to Wolves, above a
 * league list and a dashed paragraph of caveats, and needed three screens of
 * scrolling. Follows saved before the change, including other leagues' clubs
 * and `league:` ids, stay in storage and out of the count.
 */
function Following() {
  useFollowSync();
  const followed = useFollowed();
  const fetchClubs = useServerFn(getPremierLeagueClubs);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["premier-league-clubs"],
    queryFn: () => fetchClubs(),
    staleTime: 5 * 60_000,
  });
  const clubs = data?.clubs ?? [];
  const count = clubs.filter((club) => followed.has(`team:${club.id}`)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col py-[clamp(8px,2dvh,20px)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">Premier League</p>
        {count > 0 && (
          <p className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {count} followed
          </p>
        )}
      </div>
      <h1 className="mt-1 text-[clamp(22px,4.4dvh,28px)] font-semibold leading-tight tracking-tight [@media(max-height:620px)]:sr-only">
        Your teams.
      </h1>
      {/* Honest about what a follow does, in one line. Full Time makes one
          show a day for everyone; a follow does not change which match. */}
      <p className="mt-1 text-[13px] text-muted-foreground">
        Saved for later. Everyone hears the same show.
      </p>

      <div className="mt-[clamp(8px,2.2dvh,20px)]">
        {isError ? (
          <div className="surface rounded-[var(--radius-lg)] p-4 text-sm">
            <p>Teams could not be loaded.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 min-h-11 font-semibold text-[var(--lime)]"
            >
              Try again
            </button>
          </div>
        ) : !isLoading && clubs.length === 0 ? (
          <div className="surface rounded-[var(--radius-lg)] p-4 text-sm text-muted-foreground">
            The Premier League clubs are not loaded yet.
          </div>
        ) : (
          <ul className="grid grid-cols-4 gap-[clamp(4px,1dvh,8px)]" aria-busy={isLoading}>
            {isLoading
              ? Array.from({ length: 20 }, (_, index) => (
                  <li
                    key={index}
                    className="h-[clamp(46px,8.2dvh,72px)] animate-pulse rounded-[14px] bg-white/[0.04]"
                  />
                ))
              : clubs.map((club) => (
                  <li key={club.id} className="flex">
                    <FollowButton id={`team:${club.id}`} label={club.name} crest={club.crestUrl} />
                  </li>
                ))}
          </ul>
        )}
      </div>
    </div>
  );
}
