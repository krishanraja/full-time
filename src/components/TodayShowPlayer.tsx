import { Check, ChevronRight, Pause, Play, X } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type {
  PublicEdition,
  PublicProofCard,
  PublicVariant,
} from "@/lib/api/editorial-public.server";
import { coverageDateLabel } from "@/lib/london-date";
import { playerStore, usePlayer } from "@/lib/player-store";
import type { PunditId } from "@/lib/pundit/types";
import type { PublicPrediction } from "@/lib/api/editorial-public.server";
import { editionEpisode } from "@/lib/today-show-model";
import { HapticButton } from "./HapticButton";
import { PERSONALITIES, type PersonalityId } from "./PersonalitySelector";
import { PunditAvatar } from "./PunditAvatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

export type TodayEditorialResponse = {
  coverageDate: string;
  state: "prelaunch" | "off_day" | "variant_unavailable" | "published";
  drop: { id: string } | null;
  variant: PublicVariant | null;
  latest: PublicEdition | null;
  matchId: string | null;
  teamIds: string[];
  proofCards: PublicProofCard[];
  recent: PublicEdition[];
};

function fmt(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function withoutOrphan(value: string) {
  const words = value.trim().split(/\s+/);
  if (words.length < 3) return value;
  return `${words.slice(0, -2).join(" ")} ${words.slice(-2).join(" ")}`;
}

/** Each empty state says what is true. No published show has ever existed
 *  (`prelaunch`), no match was covered on this date (`off_day`), or this AI
 *  Pundit's edition did not pass its checks (`variant_unavailable`). */
function emptyStateCopy(state: TodayEditorialResponse["state"]) {
  switch (state) {
    case "prelaunch":
      return {
        title: "First show is on the way",
        body: "We publish the moment a match passes every check. Your AI Pundit will be ready.",
      };
    case "off_day":
      return {
        title: "No match to cover today",
        body: "Nothing finished on this date. Your AI Pundit is back for the next one.",
      };
    default:
      return {
        title: "Nothing ready just yet",
        body: "We only play shows that passed every check. Come back soon and we will keep your AI Pundit ready.",
      };
  }
}

function editionFor(response: TodayEditorialResponse): PublicEdition | null {
  if (response.variant) {
    return { coverageDate: response.coverageDate, variant: response.variant };
  }
  return response.latest;
}

function PunditPicker({
  active,
  editionSeed,
  pending,
  onChoose,
}: {
  active: PunditId;
  editionSeed: string;
  pending: PunditId | null;
  onChoose: (id: PunditId) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = PERSONALITIES.find((item) => item.id === active)!;
  return (
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <HapticButton
          hapticPattern="soft"
          className="grid min-h-[92px] w-full grid-cols-[66px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[17px] border border-[color:color-mix(in_oklab,var(--lime)_38%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_10%,transparent)] px-3.5 py-3 text-left max-[349px]:grid-cols-[52px_minmax(0,1fr)_20px] max-[349px]:gap-x-2"
          aria-label={`Change AI Pundit. ${selected.name} is selected.`}
        >
          <PunditAvatar
            punditId={active}
            editionSeed={editionSeed}
            className="h-[66px] w-[66px] max-[349px]:h-[52px] max-[349px]:w-[52px] max-[349px]:rounded-[14px]"
          />
          <span className="min-w-0">
            <span className="text-mono block text-[10px] uppercase tracking-[0.15em] text-[var(--lime)]">
              AI Pundit
            </span>
            <strong className="mt-1 block whitespace-nowrap text-[clamp(14px,4.35vw,17px)] font-semibold">
              {selected.name}
            </strong>
            <span className="mt-1 block text-[13px] leading-[1.3] text-muted-foreground [text-wrap:pretty]">
              {selected.tag}
            </span>
          </span>
          <span className="text-xs font-semibold max-[349px]:sr-only">Change</span>
          <ChevronRight className="hidden h-5 w-5 max-[349px]:block" aria-hidden />
        </HapticButton>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[84dvh] max-w-[760px] rounded-t-[28px] border-[var(--pitch-line)] bg-card px-4 pb-[max(22px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="grid grid-cols-[1fr_44px] gap-3 px-0 pb-2 pt-5 text-left">
          <div>
            <DrawerTitle className="text-[25px] leading-tight [text-wrap:balance]">
              Pick your AI Pundit
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-[13px]">
              Same match. Six complete shows. Fresh look every show.
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
            aria-label="Close AI Pundit picker"
          >
            <X className="h-4 w-4" />
          </button>
        </DrawerHeader>

        <div className="relative mx-1 mb-4 mt-5 grid grid-cols-6 pt-4" aria-hidden>
          <span className="absolute left-[8%] right-[8%] top-[7px] h-0.5 bg-white/15" />
          {PERSONALITIES.map((item) => (
            <span
              key={item.id}
              className={`relative grid min-h-11 place-items-start text-center text-mono text-[8px] text-muted-foreground before:absolute before:-top-[13px] before:left-1/2 before:h-[11px] before:w-[11px] before:-translate-x-1/2 before:rounded-full before:border-2 before:border-card before:bg-[#5d6662] ${
                item.id === active
                  ? "text-foreground before:h-[15px] before:w-[15px] before:-translate-y-0.5 before:bg-[var(--lime)] before:shadow-[0_0_0_2px_rgba(99,255,63,.2)]"
                  : ""
              }`}
            >
              {item.name.replace("The ", "").slice(0, 4).toUpperCase()}
            </span>
          ))}
        </div>

        <div className="grid gap-2" role="radiogroup" aria-label="AI Pundits">
          {PERSONALITIES.map((item) => {
            const checked = item.id === active;
            const loading = item.id === pending;
            return (
              <HapticButton
                key={item.id}
                hapticPattern="soft"
                role="radio"
                aria-checked={checked}
                disabled={pending !== null}
                onClick={() => {
                  if (checked) {
                    setOpen(false);
                    return;
                  }
                  setOpen(false);
                  onChoose(item.id);
                }}
                className={`grid min-h-[72px] w-full grid-cols-[48px_minmax(0,1fr)_24px] items-center gap-x-3 rounded-[15px] border px-3 py-2 text-left disabled:opacity-70 ${
                  checked
                    ? "border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_10%,transparent)]"
                    : "border-[var(--pitch-line)] bg-[#0d1315]"
                }`}
              >
                <PunditAvatar
                  punditId={item.id}
                  editionSeed={editionSeed}
                  className="h-12 w-12 rounded-[14px]"
                />
                <span className="min-w-0">
                  <strong className="block whitespace-nowrap text-sm">{item.name}</strong>
                  <small className="mt-1 block text-xs leading-[1.3] text-muted-foreground [text-wrap:pretty]">
                    {loading ? `Loading ${item.name}...` : item.tag}
                  </small>
                </span>
                <span
                  className={`grid h-[21px] w-[21px] place-items-center rounded-full border ${
                    checked
                      ? "border-[var(--lime)] bg-[var(--lime)] text-[#071008]"
                      : "border-white/30 text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              </HapticButton>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function TodayShowPlayer({
  response,
  activePundit,
  pendingPundit,
  switchError,
  settled,
  onChoosePundit,
  onRetry,
}: {
  response: TodayEditorialResponse;
  activePundit: PersonalityId;
  pendingPundit: PersonalityId | null;
  switchError: string | null;
  settled: PublicPrediction[];
  onChoosePundit: (id: PersonalityId) => void;
  onRetry: () => void;
}) {
  const player = usePlayer();
  const [proofOpen, setProofOpen] = useState(false);
  const edition = editionFor(response);
  const episode = useMemo(() => (edition ? editionEpisode(edition) : null), [edition]);
  const active = episode != null && player.episode?.id === episode.id;
  const playing = active && player.isPlaying;
  const progress = active ? player.progress : 0;
  const elapsed = progress * (episode?.durationSec ?? 0);
  const meta = PERSONALITIES.find((item) => item.id === activePundit)!;
  const fallback = response.variant == null && edition != null;
  const playerState = pendingPundit
    ? "LOADING"
    : playing
      ? "PLAYING"
      : active && player.status === "loading"
        ? "LOADING"
        : progress > 0
          ? "PAUSED"
          : "READY";

  if (!edition || !episode) {
    const empty = emptyStateCopy(response.state);
    return (
      <main className="px-0 pb-8 pt-4">
        <p className="eyebrow">{coverageDateLabel(response.coverageDate)}</p>
        <section className="surface rounded-[26px] border-t-2 border-t-[var(--lime)] p-5">
          <h1 className="max-w-[18ch] text-[clamp(30px,9vw,46px)] font-semibold leading-[0.98] tracking-[-0.055em] [text-wrap:balance]">
            {empty.title}
          </h1>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
            {empty.body}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="px-0 pb-8 pt-4">
      <p className="eyebrow mb-3">{coverageDateLabel(edition.coverageDate)}</p>
      <article
        className="surface relative overflow-hidden rounded-[26px] border-t-2 border-t-[var(--lime)] p-5 sm:p-7"
        aria-labelledby="today-show-title"
      >
        {fallback && (
          <p className="mb-3 text-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Latest show for {meta.name} · {coverageDateLabel(edition.coverageDate)}
          </p>
        )}
        <h1
          id="today-show-title"
          className="max-w-[20ch] text-[clamp(30px,9vw,46px)] font-semibold leading-[0.98] tracking-[-0.055em] [hyphens:none] [overflow-wrap:normal] [text-wrap:balance]"
        >
          {withoutOrphan(episode.title)}
        </h1>
        <p className="mb-[18px] mt-[13px] max-w-[36ch] text-[15px] leading-[1.45] text-[#c5cbc8] [hyphens:none] [text-wrap:pretty]">
          {episode.hook}
        </p>

        <PunditPicker
          active={activePundit}
          editionSeed={edition.variant.drop_id}
          pending={pendingPundit}
          onChoose={onChoosePundit}
        />

        <div className="mt-[17px] grid grid-cols-[64px_1fr] items-center gap-3.5">
          <HapticButton
            hapticPattern="success"
            onClick={() => (active ? playerStore.toggle() : playerStore.play(episode, [episode]))}
            disabled={pendingPundit !== null}
            className="grid h-16 w-16 place-items-center rounded-full border-0 bg-[var(--lime)] text-[#09100c] shadow-[0_10px_28px_rgba(99,255,63,.16)] disabled:opacity-60"
            aria-label={playing ? "Pause today's show" : "Play today's show"}
          >
            {playing ? (
              <Pause className="h-7 w-7" fill="currentColor" />
            ) : (
              <Play className="h-7 w-7" fill="currentColor" />
            )}
          </HapticButton>
          <div className="min-w-0">
            <div className="mb-2 flex justify-between gap-2 text-mono text-[10px] tracking-[0.08em]">
              <span className="text-[var(--lime)]">{playerState}</span>
              <span className="text-muted-foreground">
                {fmt(elapsed)} / {fmt(episode.durationSec)}
              </span>
            </div>
            <input
              className="today-progress w-full"
              type="range"
              min="0"
              max="1000"
              value={Math.round(progress * 1000)}
              onChange={(event) => playerStore.seek(Number(event.target.value) / 1000)}
              aria-label="Show progress"
              style={{ "--progress": `${progress * 100}%` } as CSSProperties}
              disabled={!active}
            />
          </div>
        </div>

        {response.proofCards.length > 0 && (
          <div>
            <button
              type="button"
              className="mt-2 inline-flex min-h-12 items-center gap-2 text-sm font-semibold"
              aria-expanded={proofOpen}
              aria-controls="today-proof-cards"
              onClick={() => setProofOpen((value) => !value)}
            >
              <span className="grid h-[25px] w-[25px] place-items-center rounded-full border border-[color:color-mix(in_oklab,var(--lime)_50%,transparent)] text-mono text-[var(--lime)]">
                ?
              </span>
              {proofOpen ? "Hide the proof" : "Show me why"}
            </button>
            {proofOpen && (
              <div id="today-proof-cards" className="mt-2 grid gap-2.5">
                {response.proofCards.map((card) => (
                  <article
                    key={card.id}
                    className="rounded-2xl border border-[var(--pitch-line)] bg-[#0d1315] p-4 text-[13px] leading-[1.45]"
                  >
                    <p>
                      <strong className="text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                        The claim
                      </strong>
                      <br />
                      {card.claim}
                    </p>
                    <div className="mt-2">
                      <strong className="text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                        The match fact
                      </strong>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {card.evidence.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    {card.boundary && (
                      <p className="mt-2 text-muted-foreground">
                        <strong className="text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                          What this cannot prove
                        </strong>
                        <br />
                        {card.boundary}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {active && player.status === "error" && player.error && (
          <p role="alert" className="mt-3 text-xs text-[#ff8877]">
            {player.error}
          </p>
        )}
      </article>

      {(pendingPundit || switchError) && (
        <div
          className="fixed bottom-[94px] left-1/2 z-[70] flex w-[min(calc(100%_-_32px),540px)] -translate-x-1/2 items-center justify-between gap-3 rounded-[14px] border border-[var(--pitch-line)] bg-[#1a2123] p-3.5 text-[13px] shadow-2xl"
          role={switchError ? "alert" : "status"}
          aria-live="polite"
        >
          <span>
            {switchError ??
              `Loading ${PERSONALITIES.find((item) => item.id === pendingPundit)?.name}. Your show is still here.`}
          </span>
          {switchError && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 px-2 font-semibold text-[var(--lime)]"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {response.recent.length > 0 && (
        <section className="mt-8" aria-labelledby="more-to-play-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="more-to-play-title"
              className="text-xl font-semibold tracking-[-0.025em] [text-wrap:balance]"
            >
              More to play
            </h2>
            <span className="text-xs text-muted-foreground">Checked shows only</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {response.recent.slice(0, 4).map((recent) => {
              const item = PERSONALITIES.find(
                (personality) => personality.id === recent.variant.pundit_id,
              )!;
              const recentEpisode = editionEpisode(recent);
              return (
                <article
                  key={recent.variant.id}
                  className="grid min-h-[82px] grid-cols-[1fr_44px] items-center gap-2 rounded-[17px] border border-[var(--pitch-line)] bg-card p-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-mono text-[10px] uppercase tracking-[0.1em] text-[var(--lime)]">
                      {coverageDateLabel(recent.coverageDate)}
                    </div>
                    <p className="mt-1 text-sm font-semibold [hyphens:none] [text-wrap:balance]">
                      {withoutOrphan(recent.variant.title)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.name} ·{" "}
                      {Math.max(1, Math.round((recent.variant.audio_duration_sec ?? 0) / 60))} min
                    </p>
                  </div>
                  <HapticButton
                    hapticPattern="success"
                    onClick={() => playerStore.play(recentEpisode, [recentEpisode])}
                    className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
                    aria-label={`Play ${recent.variant.title}`}
                  >
                    <Play className="h-4 w-4" fill="currentColor" />
                  </HapticButton>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="mt-8" aria-labelledby="pundit-record-title">
          <h2
            id="pundit-record-title"
            className="mb-3 text-xl font-semibold tracking-[-0.025em] [text-wrap:balance]"
          >
            How did they do?
          </h2>
          <Link
            to="/receipts"
            className="grid grid-cols-[1fr_auto] gap-2 rounded-[17px] border border-[var(--pitch-line)] bg-card p-4"
          >
            <strong className="[text-wrap:balance]">{meta.name}, checked after full time</strong>
            <span className="text-[13px] font-semibold text-[var(--lime)]">See it</span>
            <span className="col-span-2 text-[13px] leading-[1.4] text-muted-foreground">
              What they said, what happened, and the bit they missed.
            </span>
          </Link>
        </section>
      )}
    </main>
  );
}
