import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { TodayShowPlayer, type TodayEditorialResponse } from "@/components/TodayShowPlayer";
import { PERSONALITIES, type PersonalityId } from "@/components/PersonalitySelector";
import { useAuth } from "@/hooks/use-auth";
import { VOICE_STYLE_STORAGE_KEY } from "@/lib/entitlement";
import { currentCoverageDate } from "@/lib/london-date";
import { playerStore } from "@/lib/player-store";
import { editionEpisode } from "@/lib/today-show-model";
import { pageSeo } from "@/lib/seo";
import type { PublicPrediction } from "@/lib/api/editorial-public.server";
import { settledFixture, todayFixture } from "@/fixtures/today";

type HomeSearch = { pundit?: PersonalityId; drop?: string; fixture?: "today" };

const validPundit = (value: unknown): PersonalityId | undefined =>
  PERSONALITIES.some((personality) => personality.id === value)
    ? (value as PersonalityId)
    : undefined;

function endpointFor(drop: string | undefined, pundit: PersonalityId) {
  return drop
    ? `/api/public/drops/${encodeURIComponent(drop)}/variants/${pundit}`
    : `/api/public/drops/today?pundit=${pundit}`;
}

async function fetchEditorial(drop: string | undefined, pundit: PersonalityId) {
  const response = await fetch(endpointFor(drop, pundit), {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 404) {
      return {
        coverageDate: currentCoverageDate(),
        state: "variant_unavailable",
        drop: drop ? { id: drop } : null,
        variant: null,
        latest: null,
        matchId: null,
        teamIds: [],
        proofCards: [],
        recent: [],
      } satisfies TodayEditorialResponse;
    }
    throw new Error("We could not fetch that checked show.");
  }
  return (await response.json()) as TodayEditorialResponse;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    pundit: validPundit(search.pundit),
    drop:
      typeof search.drop === "string" && /^[0-9a-f-]{36}$/i.test(search.drop)
        ? search.drop
        : undefined,
    fixture: import.meta.env.DEV && search.fixture === "today" ? "today" : undefined,
  }),
  head: () =>
    pageSeo({
      path: "/",
      title: "Full Time - Six AI Pundits, one real match",
      description:
        "Pick an AI Pundit and play a complete football show built from checked match facts.",
    }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const useFixture = search.fixture === "today";
  const [selectedPundit, setSelectedPundit] = useState<PersonalityId>(search.pundit ?? "zen");
  const [preferenceHydrated, setPreferenceHydrated] = useState(Boolean(search.pundit));
  const [pendingPundit, setPendingPundit] = useState<PersonalityId | null>(null);
  const [failedPundit, setFailedPundit] = useState<PersonalityId | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const preferenceRevision = useRef(0);

  useEffect(() => {
    if (search.pundit) return;
    const stored = validPundit(localStorage.getItem(VOICE_STYLE_STORAGE_KEY));
    if (stored) {
      setSelectedPundit(stored);
      setPreferenceHydrated(true);
      return;
    }
    let active = true;
    const revision = preferenceRevision.current;
    void fetch("/api/profile/pundit")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { pundit?: string } | null) => {
        if (!active || revision !== preferenceRevision.current) return;
        const saved = validPundit(payload?.pundit);
        if (saved) setSelectedPundit(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active && revision === preferenceRevision.current) setPreferenceHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [search.pundit]);

  const editorial = useQuery<TodayEditorialResponse>({
    queryKey: ["editorial-drop", search.drop ?? "today", selectedPundit],
    queryFn: () => fetchEditorial(search.drop, selectedPundit),
    retry: false,
    staleTime: 30_000,
    enabled: !useFixture,
  });

  const settled = useQuery<PublicPrediction[]>({
    queryKey: ["settled-pundit-record", selectedPundit],
    queryFn: async () => {
      const response = await fetch(`/api/public/pundits/${selectedPundit}/receipts`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return [];
      return (await response.json()) as PublicPrediction[];
    },
    retry: false,
    staleTime: 60_000,
    enabled: !useFixture,
  });

  const persistPreference = useCallback(
    (pundit: PersonalityId) => {
      preferenceRevision.current += 1;
      setPreferenceHydrated(true);
      localStorage.setItem(VOICE_STYLE_STORAGE_KEY, pundit);
      void fetch("/api/profile/pundit", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ pundit }),
      });
    },
    [session?.access_token],
  );

  useEffect(() => {
    if (!preferenceHydrated || !session?.access_token || search.pundit) return;
    void fetch("/api/profile/pundit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pundit: selectedPundit }),
    });
  }, [preferenceHydrated, search.pundit, selectedPundit, session?.access_token]);

  const choosePundit = useCallback(
    async (pundit: PersonalityId) => {
      if (pundit === selectedPundit || pendingPundit) return;
      setPendingPundit(pundit);
      setFailedPundit(null);
      setSwitchError(null);
      const wasPlaying = playerStore.get().isPlaying;
      try {
        const response = useFixture
          ? todayFixture(pundit)
          : await queryClient.fetchQuery({
              queryKey: ["editorial-drop", search.drop ?? "today", pundit],
              queryFn: () => fetchEditorial(search.drop, pundit),
              staleTime: 30_000,
            });
        const edition = response.variant
          ? { coverageDate: response.coverageDate, variant: response.variant }
          : response.latest;
        if (!edition)
          throw new Error(
            `${PERSONALITIES.find((item) => item.id === pundit)?.name} does not have a checked show yet.`,
          );
        await playerStore.switchEpisode(editionEpisode(edition), { autoplay: wasPlaying });
        setSelectedPundit(pundit);
        persistPreference(pundit);
      } catch (error) {
        setFailedPundit(pundit);
        setSwitchError(
          error instanceof Error
            ? `${error.message} Your old show is still here.`
            : "That AI Pundit could not load. Your old show is still here.",
        );
      } finally {
        setPendingPundit(null);
      }
    },
    [pendingPundit, persistPreference, queryClient, search.drop, selectedPundit, useFixture],
  );

  const editorialData = useFixture ? todayFixture(selectedPundit) : editorial.data;
  const settledData = useFixture ? settledFixture(selectedPundit) : (settled.data ?? []);

  if (!useFixture && (editorial.isLoading || !editorialData)) {
    return (
      <main className="pb-8 pt-4" aria-label="Loading today's show">
        <div className="mb-3 h-3 w-36 animate-pulse rounded bg-[var(--lime)]/20" />
        <div className="surface h-[620px] animate-pulse rounded-[26px]" />
      </main>
    );
  }

  if (!useFixture && editorial.isError) {
    return (
      <main className="pb-8 pt-4">
        <section className="surface rounded-[26px] border-t-2 border-t-[var(--lime)] p-5">
          <h1 className="text-[34px] font-semibold leading-none tracking-tight [text-wrap:balance]">
            The show is having a wobble
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your saved AI Pundit is safe. Try this page again in a moment.
          </p>
          <button
            type="button"
            onClick={() => void editorial.refetch()}
            className="mt-5 min-h-11 rounded-full bg-[var(--lime)] px-5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <TodayShowPlayer
      response={editorialData!}
      activePundit={selectedPundit}
      pendingPundit={pendingPundit}
      switchError={switchError}
      settled={settledData}
      onChoosePundit={(pundit) => void choosePundit(pundit)}
      onRetry={() => {
        if (failedPundit) void choosePundit(failedPundit);
      }}
    />
  );
}
