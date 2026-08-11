import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { AudioCard } from "../components/AudioCard";
import { DailyShowCard } from "../components/DailyShowCard";
import { EpisodeListItem } from "../components/EpisodeListItem";
import { HapticButton } from "../components/HapticButton";
import { PERSONALITIES, type PersonalityId } from "../components/PersonalitySelector";
import { useTodayFeed } from "../hooks/use-episodes";
import { useAuth } from "../hooks/use-auth";
import { useFollowed } from "../lib/follow-store";
import { playerStore } from "../lib/player-store";
import { getTodayFeed } from "@/lib/api/feed.functions";
import { VOICE_STYLE_STORAGE_KEY } from "@/lib/entitlement";
import { coverageDateLabel, currentCoverageDate } from "@/lib/london-date";
import { pageSeo } from "@/lib/seo";
import type { Episode } from "../data/mockEpisodes";

type HomeSearch = { pundit?: PersonalityId; drop?: string };

type EditorialVariant = {
  id: string;
  drop_id: string;
  pundit_id: PersonalityId;
  title: string;
  description: string;
  display_script: string;
  audio_url: string;
  audio_duration_sec: number | null;
  published_at: string;
};

type EditorialResponse = {
  coverageDate: string;
  state: "prelaunch" | "off_day" | "variant_unavailable" | "published";
  drop: { id: string } | null;
  variant: EditorialVariant | null;
};

const validPundit = (value: unknown): PersonalityId | undefined =>
  PERSONALITIES.some((personality) => personality.id === value)
    ? (value as PersonalityId)
    : undefined;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    pundit: validPundit(search.pundit),
    drop:
      typeof search.drop === "string" && /^[0-9a-f-]{36}$/i.test(search.drop)
        ? search.drop
        : undefined,
  }),
  loader: async () => {
    try {
      return await getTodayFeed();
    } catch (error: unknown) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "feed_ssr_failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  },
  head: () =>
    pageSeo({
      path: "/",
      title: "Full Time - Pre-launch",
      description:
        "Six AI football pundits. Evidence-backed opinions and public prediction receipts.",
    }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const initialFeed =
    Route.useLoaderData() ??
    ({
      episodes: [],
      tonight: [],
      coda: null,
      coverageDate: currentCoverageDate(),
      state: "pending",
    } as const);
  const feed = useTodayFeed(initialFeed);
  const data = feed.data ?? initialFeed;
  const [savedPundit, setSavedPundit] = useState<PersonalityId>("zen");
  const [preferenceHydrated, setPreferenceHydrated] = useState(false);
  const preferenceRevision = useRef(0);
  const [previewPundit, setPreviewPundit] = useState<PersonalityId | null>(search.pundit ?? null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const { session } = useAuth();
  const followed = useFollowed();
  const selectedPundit = previewPundit ?? savedPundit;
  const selectedMeta = PERSONALITIES.find((personality) => personality.id === selectedPundit)!;

  useEffect(() => {
    const stored = validPundit(localStorage.getItem(VOICE_STYLE_STORAGE_KEY));
    if (stored) {
      setSavedPundit(stored);
      setPreferenceHydrated(true);
      return;
    }
    let active = true;
    const revision = preferenceRevision.current;
    void fetch("/api/profile/pundit")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { pundit?: string } | null) => {
        if (!active || revision !== preferenceRevision.current) return;
        const cookiePundit = validPundit(payload?.pundit);
        if (cookiePundit) setSavedPundit(cookiePundit);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active && revision === preferenceRevision.current) setPreferenceHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferenceHydrated || !session?.access_token) return;
    void fetch("/api/profile/pundit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pundit: savedPundit }),
    });
  }, [preferenceHydrated, savedPundit, session?.access_token]);

  const editorial = useQuery<EditorialResponse>({
    queryKey: ["editorial-drop", search.drop ?? "today", selectedPundit],
    queryFn: async () => {
      const endpoint = search.drop
        ? `/api/public/drops/${encodeURIComponent(search.drop)}/variants/${selectedPundit}`
        : `/api/public/drops/today?pundit=${selectedPundit}`;
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) {
        if (response.status === 404 && search.drop) {
          return {
            coverageDate: data?.coverageDate ?? "",
            state: "variant_unavailable",
            drop: { id: search.drop },
            variant: null,
          };
        }
        throw new Error("The approved editorial feed is temporarily unavailable.");
      }
      const payload = (await response.json()) as EditorialResponse | EditorialVariant;
      if (search.drop && "drop_id" in payload) {
        return {
          coverageDate: data?.coverageDate ?? payload.published_at.slice(0, 10),
          state: "published",
          drop: { id: payload.drop_id },
          variant: payload,
        };
      }
      return payload as EditorialResponse;
    },
    retry: false,
    staleTime: 30_000,
  });

  const choosePundit = (pundit: PersonalityId) => {
    preferenceRevision.current += 1;
    setSavedPundit(pundit);
    setPreferenceHydrated(true);
    setPreviewPundit(null);
    setShareStatus(null);
    localStorage.setItem(VOICE_STYLE_STORAGE_KEY, pundit);
    void fetch("/api/profile/pundit", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ pundit }),
    });
  };

  const shareVariant = async (variant: EditorialVariant) => {
    const url = new URL(window.location.origin);
    url.searchParams.set("drop", variant.drop_id);
    url.searchParams.set("pundit", variant.pundit_id);
    const shareData = {
      title: `${variant.title}: ${selectedMeta.name}`,
      text: `Listen to ${selectedMeta.name}'s Full Time morning drop.`,
      url: url.toString(),
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus("Share link copied.");
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share this edition.");
    }
  };

  const rawEpisodes = useMemo(() => (data?.episodes ?? []) as Episode[], [data?.episodes]);
  const episodes = useMemo(() => {
    if (!followed.size) return rawEpisodes;
    const isFollowed = (episode: Episode) =>
      (episode.homeTeamId != null && followed.has(`team:${episode.homeTeamId}`)) ||
      (episode.awayTeamId != null && followed.has(`team:${episode.awayTeamId}`)) ||
      (episode.leagueId != null && followed.has(`league:${episode.leagueId}`));
    return [...rawEpisodes].sort((a, b) => Number(isFollowed(b)) - Number(isFollowed(a)));
  }, [rawEpisodes, followed]);

  const { tonight, coda, coverageDate, state } = data;
  const variant = editorial.data?.variant ?? null;
  const dailyEpisode: Episode | null = variant
    ? {
        id: variant.id,
        title: variant.title,
        hook: variant.description,
        script: variant.display_script,
        homeTeam: "Full Time",
        awayTeam: selectedMeta.name,
        homeScore: 0,
        awayScore: 0,
        competition: "Morning show",
        durationSec: variant.audio_duration_sec ?? 0,
        audioUrl: variant.audio_url,
        format: "daily",
        punditName: selectedMeta.name,
      }
    : null;

  return (
    <div className="pb-6 pt-4">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-start md:gap-10">
        <div className="md:sticky md:top-24">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="eyebrow">Coverage / {coverageDateLabel(coverageDate)}</div>
            <h1 className="mt-3 max-w-[10ch] text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[52px]">
              One morning. Six minds.
            </h1>
            <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">
              Pick the football brain you want in your ears. The facts stay fixed; the judgment,
              humour and story change completely.
            </p>
          </motion.div>

          {search.pundit && previewPundit && (
            <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--pitch-line)] p-3 text-xs leading-relaxed text-muted-foreground">
              Previewing {selectedMeta.name} from a shared link. Your saved pundit has not changed.
            </div>
          )}

          <section className="mt-7" aria-labelledby="pundit-selector-title">
            <div id="pundit-selector-title" className="eyebrow mb-3">
              1 / Choose your pundit
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PERSONALITIES.map((personality, index) => (
                <HapticButton
                  key={personality.id}
                  hapticPattern="soft"
                  aria-pressed={selectedPundit === personality.id}
                  onClick={() => choosePundit(personality.id)}
                  className={
                    "group min-h-[92px] rounded-[var(--radius-lg)] border px-3 py-3 text-left transition-all " +
                    (selectedPundit === personality.id
                      ? "border-[color:color-mix(in_oklab,var(--lime)_65%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_9%,var(--card))] text-foreground shadow-[0_16px_36px_-28px_var(--lime)]"
                      : "border-[var(--pitch-line)] bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-white/20")
                  }
                >
                  <span className="text-mono flex items-center justify-between text-[9px] uppercase tracking-[0.14em] opacity-60">
                    0{index + 1}
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedPundit === personality.id ? "bg-[var(--lime)]" : "bg-white/20"
                      }`}
                    />
                  </span>
                  <span className="mt-2 block text-xs font-semibold tracking-tight">
                    {personality.name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[10px] font-normal leading-snug opacity-70">
                    {personality.tag}
                  </span>
                </HapticButton>
              ))}
            </div>
          </section>
        </div>

        <div className="min-w-0 md:pt-4">
          <div className="eyebrow md:mb-[-8px]">2 / Hear their edition</div>

          {editorial.isLoading ? (
            <div
              className="mt-6 h-56 animate-pulse rounded-3xl bg-card"
              aria-label="Loading pundit edition"
            />
          ) : dailyEpisode && variant ? (
            <>
              <DailyShowCard episode={dailyEpisode} onShare={() => void shareVariant(variant)} />
              {shareStatus && (
                <p aria-live="polite" className="mt-2 text-center text-xs text-muted-foreground">
                  {shareStatus}
                </p>
              )}
            </>
          ) : episodes.length === 0 ? (
            <div className="surface relative mt-6 min-h-[420px] overflow-hidden rounded-[calc(var(--radius-2xl)+4px)] p-6 sm:p-8">
              <div
                aria-hidden
                className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--lime)] opacity-[0.06] blur-3xl"
              />
              <div className="relative flex min-h-[356px] flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="eyebrow">{selectedMeta.name} edition</div>
                  <span className="text-mono rounded-full border border-[var(--pitch-line)] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Gates running
                  </span>
                </div>
                <h2 className="mt-8 max-w-[12ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[44px]">
                  The next show earns its way here.
                </h2>
                <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
                  {editorial.isError
                    ? "The approved editorial feed is temporarily unavailable. No unverified fallback has been substituted."
                    : editorial.data?.state === "variant_unavailable"
                      ? `${selectedMeta.name}'s edition has not passed every publication gate yet.`
                      : state === "pending"
                        ? "Matches finished, but no recap has passed the editorial and audio gates yet."
                        : "No covered matches finished on this date. Nothing stale has been relabelled as current."}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-2 pt-8 text-center">
                  {[
                    ["25", "script gates"],
                    ["99%", "name accuracy"],
                    ["100%", "receipted"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-[var(--pitch-line)] bg-black/10 p-3"
                    >
                      <div className="text-mono text-lg font-semibold text-foreground">{value}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <HapticButton
                hapticPattern="success"
                onClick={() => playerStore.playAll(episodes)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-transform active:scale-[0.99]"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Play the morning / {episodes.length} {episodes.length === 1 ? "recap" : "recaps"}
              </HapticButton>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="mt-4"
              >
                <AudioCard episode={episodes[0]} hero queue={episodes} />
              </motion.div>

              {episodes.length > 1 && (
                <section className="mt-8">
                  <div className="mb-3 flex items-baseline justify-between">
                    <div className="eyebrow">This drop</div>
                    <span className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {episodes.length - 1} more
                    </span>
                  </div>
                  <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {episodes.slice(1).map((episode) => (
                      <div key={episode.id} className="w-[80%] shrink-0 snap-start">
                        <AudioCard episode={episode} queue={episodes} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {coda && (
        <section className="surface mt-8 rounded-[var(--radius-2xl)] p-5">
          <div className="eyebrow mb-2">One thing we noticed</div>
          <p className="text-[15px] leading-relaxed text-foreground">{coda}</p>
        </section>
      )}

      <section className="mt-12" aria-labelledby="proof-title">
        <div className="eyebrow">The Full Time standard</div>
        <h2 id="proof-title" className="mt-3 max-w-[18ch] text-2xl font-semibold tracking-tight">
          Personality gets attention. Accountability earns trust.
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["6", "complete pundits", "Different thesis, script, humour and voice."],
            ["25", "gates per script", "Insight and personality never hide a factual miss."],
            ["5-8", "minutes daily", "A real morning show, not a stitched highlights reel."],
            ["1", "public ledger", "Every pre-match claim gets a visible settlement."],
          ].map(([value, label, detail]) => (
            <article key={label} className="surface rounded-[var(--radius-lg)] p-5">
              <div className="text-mono text-3xl font-semibold tracking-tight text-[var(--lime)]">
                {value}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{label}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      {tonight.length > 0 && (
        <section className="mt-8">
          <div className="eyebrow mb-3">Tonight</div>
          <ul className="flex flex-col border-y border-[var(--pitch-line)]">
            {tonight.map((match) => (
              <li
                key={match.id}
                className="flex items-center justify-between border-b border-[var(--pitch-line)] py-3 last:border-b-0"
              >
                <span className="text-sm font-semibold tracking-tight">{match.label}</span>
                <span className="text-mono text-xs tabular-nums text-muted-foreground">
                  {match.kickoff}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {episodes.length > 1 && (
        <section className="mt-8">
          <div className="eyebrow mb-3">Up next in the feed</div>
          <div className="flex flex-col gap-1">
            {episodes.slice(1, 3).map((episode) => (
              <EpisodeListItem key={episode.id} episode={episode} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
