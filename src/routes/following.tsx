import { createFileRoute } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Backdrop } from "../components/Backdrop";
import { FollowButton } from "../components/FollowButton";
import { clubInks } from "../lib/club-colours";
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

  // The first two followed clubs light the top corners, as the match does on Today.
  const lit = clubs.filter((club) => followed.has(`team:${club.id}`)).slice(0, 2);
  const glow = (name: string, x: string) => {
    const inks = clubInks(name);
    return `radial-gradient(75% 42% at ${x} 0%, color-mix(in srgb, ${inks.glow} ${(12 * inks.glowStrength).toFixed(1)}%, transparent), transparent 70%)`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {lit.length > 0 && (
        <Backdrop>
          <div
            className="absolute inset-0"
            style={{
              background: [glow(lit[0].name, "0%"), glow((lit[1] ?? lit[0]).name, "100%")].join(
                ",",
              ),
            }}
          />
        </Backdrop>
      )}
      <div className="shrink-0 pb-[clamp(7px,calc(4.5dvh-17.7px),18px)] pt-[clamp(6px,calc(5.1dvh-22px),18px)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">Premier League</p>
          {count > 0 && <p className="text-[13px] text-ink-2">{count} followed</p>}
        </div>
        <h1 className="serif mt-[clamp(2px,calc(2.8dvh-13.4px),8px)] text-[clamp(30px,calc(8.3dvh-14.4px),50px)] leading-[0.95] tracking-[-0.005em] [@media(max-height:560px)]:sr-only">
          Your teams.
        </h1>
        {/* Honest about what a follow does, in one line. Full Time makes one
            show a day for everyone; a follow does not change which match. */}
        <p className="mt-[clamp(4px,calc(2.8dvh-11.4px),10px)] text-[clamp(13.5px,2dvh,15px)] text-ink-2">
          Saved for later. Everyone hears the same show.
        </p>
      </div>

      {isError ? (
        <div className="rounded-[3px] bg-card p-4 text-sm">
          <p>Teams could not be loaded.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 min-h-11 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : !isLoading && clubs.length === 0 ? (
        <div className="rounded-[3px] bg-card p-4 text-sm text-ink-2">
          The Premier League clubs are not loaded yet.
        </div>
      ) : (
        <ul
          className="grid min-h-0 flex-[1_1_auto] grid-cols-4 grid-rows-[repeat(5,minmax(44px,1fr))] border-t border-[var(--pitch-line)] pb-[clamp(6px,1.4dvh,12px)]"
          aria-busy={isLoading}
        >
          {isLoading
            ? Array.from({ length: 20 }, (_, index) => (
                <li key={index} className="border-b border-[var(--pitch-line)] p-1.5">
                  <div className="mx-auto h-full max-h-12 animate-pulse rounded-[2px] bg-white/[0.04]" />
                </li>
              ))
            : clubs.map((club) => (
                <li key={club.id} className="flex border-b border-[var(--pitch-line)]">
                  <FollowButton id={`team:${club.id}`} label={club.name} crest={club.crestUrl} />
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
