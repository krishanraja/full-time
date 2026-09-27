import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { TodayShowPlayer } from "@/components/TodayShowPlayer";
import { PERSONALITIES, type PersonalityId } from "@/components/PersonalitySelector";
import { useAuth } from "@/hooks/use-auth";
import { VOICE_STYLE_STORAGE_KEY } from "@/lib/entitlement";
import { editionPunditFor } from "@/lib/edition-pundit";
import { playerStore } from "@/lib/player-store";
import { editionEpisode, showFrom, type TodayShow } from "@/lib/today-show-model";
import { pageSeo } from "@/lib/seo";
import type { PublicMatch, PublicToday } from "@/lib/api/editorial-public.server";
import { fixtureVariant, todayFixture } from "@/fixtures/today";

type HomeSearch = { pundit?: PersonalityId; drop?: string; fixture?: "today" };

const validPundit = (value: unknown): PersonalityId | undefined =>
  PERSONALITIES.some((personality) => personality.id === value)
    ? (value as PersonalityId)
    : undefined;

async function fetchToday(pundit: PersonalityId, drop: string | undefined) {
  const query = new URLSearchParams({ pundit });
  if (drop) query.set("drop", drop);
  const response = await fetch(`/api/public/drops/today?${query}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("We could not fetch today's show.");
  return (await response.json()) as PublicToday;
}

/** One pundit's show about one match. A 404 means that pundit published
 *  nothing for it, which Today prevents by only offering pundits who did. */
async function fetchShow(drop: string, pundit: PersonalityId) {
  const response = await fetch(`/api/public/drops/${encodeURIComponent(drop)}/variants/${pundit}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("We could not fetch that checked show.");
  return (await response.json()) as PublicToday;
}

/** The show the listener last committed to on Today: switched to, stepped
 *  to, or pressed play on. Module state, so it outlives the page: leaving for
 *  Teams and coming back used to reopen on the server's pick while another
 *  match kept playing, with no pause control on screen. Restored only while
 *  the player still holds that exact show. */
let committed: TodayShow | null = null;

function pinnedShow(): TodayShow | null {
  return committed && playerStore.get().episode?.id === committed.variant.id ? committed : null;
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
        "Pick an AI Pundit and play a complete Premier League show built from checked match facts.",
    }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const useFixture = search.fixture === "today";
  // The listener's saved pundit. Today opens each match on it when that
  // pundit made a show, and on whoever did when they did not.
  const [preferred, setPreferred] = useState<PersonalityId>(search.pundit ?? "zen");
  const [preferenceHydrated, setPreferenceHydrated] = useState(Boolean(search.pundit));
  // Whether `preferred` came from this device (local storage or the device
  // cookie) rather than the "zen" default. Only a real choice is copied to a
  // signed-in profile: copying the default overwrote a pick made on another
  // device the first time a listener opened Today somewhere new.
  const [preferenceFromDevice, setPreferenceFromDevice] = useState(false);
  // What is on screen once the listener has moved: another pundit or another
  // match. Null means "whatever the Today response opened on".
  const [view, setViewState] = useState<TodayShow | null>(pinnedShow);
  const setView = useCallback((show: TodayShow) => {
    committed = show;
    setViewState(show);
  }, []);
  const [pending, setPending] = useState<{ dropId: string; pundit: PersonalityId } | null>(null);
  const [failed, setFailed] = useState<{
    dropId: string;
    pundit: PersonalityId;
    remember: boolean;
  } | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const preferenceRevision = useRef(0);
  // The latest match list, read inside open() without re-creating it.
  const matchesRef = useRef<PublicMatch[]>([]);

  useEffect(() => {
    if (search.pundit) return;
    const stored = validPundit(localStorage.getItem(VOICE_STYLE_STORAGE_KEY));
    if (stored) {
      setPreferred(stored);
      setPreferenceFromDevice(true);
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
        if (saved) {
          setPreferred(saved);
          setPreferenceFromDevice(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active && revision === preferenceRevision.current) setPreferenceHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [search.pundit]);

  // Keyed on the pundit the page opened with, not on later switches: a switch
  // is a transaction below, and refetching Today under it would yank the
  // listener back to wherever the server opens.
  const [openingPundit, setOpeningPundit] = useState<PersonalityId | null>(null);
  useEffect(() => {
    if (preferenceHydrated && openingPundit === null) setOpeningPundit(preferred);
  }, [openingPundit, preferenceHydrated, preferred]);

  const today = useQuery<PublicToday>({
    queryKey: ["today", search.drop ?? "latest", openingPundit],
    queryFn: () => fetchToday(openingPundit!, search.drop),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !useFixture && openingPundit !== null,
  });

  const persistPreference = useCallback(
    (pundit: PersonalityId) => {
      preferenceRevision.current += 1;
      setPreferenceHydrated(true);
      setPreferenceFromDevice(true);
      setPreferred(pundit);
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
    if (!preferenceHydrated || !preferenceFromDevice || !session?.access_token || search.pundit) {
      return;
    }
    void fetch("/api/profile/pundit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pundit: preferred }),
    });
  }, [preferenceFromDevice, preferenceHydrated, search.pundit, preferred, session?.access_token]);

  /** Load the requested show before committing to it: the show on screen
   *  stays playable until the new one's audio is ready, and play or pause
   *  carries over. The same transaction serves a pundit switch and a match
   *  step, so what is on screen is always what the player holds. */
  const open = useCallback(
    async (dropId: string, pundit: PersonalityId, remember: boolean) => {
      if (pending) return;
      setPending({ dropId, pundit });
      setFailed(null);
      setSwitchError(null);
      const wasPlaying = playerStore.get().isPlaying;
      try {
        const response = useFixture
          ? fixtureVariant(dropId, pundit)
          : await queryClient.fetchQuery({
              queryKey: ["show", dropId, pundit],
              queryFn: () => fetchShow(dropId, pundit),
              staleTime: 5 * 60_000,
            });
        const found = response ? showFrom(response) : null;
        if (!found) throw new Error("That show is not available.");
        // The variant endpoint loses the fixture when its pack lookup fails;
        // the match list still knows who played.
        const next: TodayShow = found.fixture
          ? found
          : {
              ...found,
              fixture: matchesRef.current.find((match) => match.dropId === dropId)?.fixture ?? null,
            };
        // Already loaded: keep its place rather than restart it from 0:00.
        if (playerStore.get().episode?.id !== next.variant.id) {
          await playerStore.switchEpisode(editionEpisode(next, next.fixture), {
            autoplay: wasPlaying,
          });
        }
        setView(next);
        if (remember) persistPreference(pundit);
      } catch (error) {
        setFailed({ dropId, pundit, remember });
        setSwitchError(
          error instanceof Error
            ? `${error.message} Your show is still here.`
            : "That show could not load. Your show is still here.",
        );
      } finally {
        setPending(null);
      }
    },
    [pending, persistPreference, queryClient, setView, useFixture],
  );

  const data = useFixture ? todayFixture(preferred, search.drop) : today.data;
  matchesRef.current = data?.matches ?? [];

  // Only when there is nothing to show. A failed background refetch keeps
  // the last good data; replacing it with this screen took away the play
  // control while the audio kept playing.
  if (!useFixture && today.isError && !today.data) {
    return (
      <main className="flex min-h-0 flex-1 flex-col justify-center py-4">
        <h1 className="text-[34px] font-semibold leading-none tracking-tight [text-wrap:balance]">
          The show is having a wobble
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Your saved AI Pundit is safe. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => void today.refetch()}
          className="mt-5 min-h-11 self-start rounded-full bg-[var(--lime)] px-5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main
        className="flex min-h-0 flex-1 flex-col justify-center gap-4 py-4"
        aria-label="Loading today's show"
      >
        <div className="h-3 w-44 animate-pulse rounded bg-[var(--lime)]/20" />
        <div className="h-[108px] animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-6 grid grid-cols-6 gap-2">
          {PERSONALITIES.map((item) => (
            <div
              key={item.id}
              className="aspect-square animate-pulse rounded-[16px] bg-white/[0.04]"
            />
          ))}
        </div>
        <div className="mt-6 h-16 animate-pulse rounded-full bg-white/[0.04]" />
      </main>
    );
  }

  const show = view ?? showFrom(data);
  const matches = data.matches;

  return (
    <TodayShowPlayer
      show={show}
      matches={matches}
      state={data.state}
      pending={pending}
      switchError={switchError}
      onOpen={(dropId, pundit) => void open(dropId, pundit, true)}
      onPlay={(played) => setView(played)}
      onStep={(match: PublicMatch) => {
        const pundit = editionPunditFor(match, preferred);
        if (pundit) void open(match.dropId, pundit, false);
      }}
      onRetry={() => {
        if (failed) void open(failed.dropId, failed.pundit, failed.remember);
      }}
    />
  );
}
