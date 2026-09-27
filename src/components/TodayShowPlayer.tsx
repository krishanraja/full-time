import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  PublicFixture,
  PublicMatch,
  PublicProofCard,
  PublicToday,
} from "@/lib/api/editorial-public.server";
import { coverageDateLabel, coverageDateShortLabel } from "@/lib/london-date";
import { playerStore, usePlayer } from "@/lib/player-store";
import { clubDisplayName } from "@/lib/premier-league";
import type { PunditId } from "@/lib/pundit/types";
import { editionEpisode, matchLabel, type TodayShow } from "@/lib/today-show-model";
import { cn } from "@/lib/utils";
import { ClubCrest } from "./ClubCrest";
import { HapticButton } from "./HapticButton";
import { PERSONALITIES } from "./PersonalitySelector";
import { PunditAvatar } from "./PunditAvatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

/**
 * Today: one match, on one screen.
 *
 * Ruling (Krish, 2026-09-27): show which game it is, one select thing that
 * shows the novelty, and nothing that needs a scroll. This page used to open
 * on a model-written headline and dek with no team names or score anywhere,
 * then a list of other matches below the player, so a listener could not
 * tell which game they were hearing about.
 *
 * Top to bottom: the match (competition, date, both clubs, the score), the
 * six AI Pundits for that match as the one novel thing, the player, and a
 * quiet "Show me why" that opens the proof in a sheet. Earlier Premier League
 * matches are one tap away on either side of the date, one at a time.
 */

function fmt(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Each empty state says what is true. No published show has ever existed
 *  (`prelaunch`), no match was covered on this date (`off_day`), or nothing
 *  passed its checks (`variant_unavailable`). */
function emptyStateCopy(state: PublicToday["state"]) {
  switch (state) {
    case "prelaunch":
      return {
        title: "First show is on the way",
        body: "We publish the moment a Premier League match passes every check.",
      };
    case "off_day":
      return {
        title: "No match to cover today",
        body: "Nothing finished on this date. Your AI Pundit is back for the next one.",
      };
    default:
      return {
        title: "Nothing ready just yet",
        body: "We only play shows that passed every check. Come back soon.",
      };
  }
}

function personality(id: PunditId) {
  return PERSONALITIES.find((item) => item.id === id)!;
}

function TeamRow({
  name,
  crest,
  score,
  outcome,
}: {
  name: string;
  crest?: string | null;
  score: number | null;
  outcome: "won" | "lost" | "level";
}) {
  return (
    <div className="flex h-[clamp(40px,7.2dvh,58px)] items-center gap-3">
      <ClubCrest src={crest} className="h-[clamp(30px,5dvh,40px)] w-[clamp(30px,5dvh,40px)]" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[clamp(24px,7.2vw,32px)] font-semibold leading-none tracking-[-0.045em]",
          outcome === "lost" && "text-muted-foreground",
        )}
      >
        {clubDisplayName(name)}
      </span>
      <span
        className={cn(
          "text-mono text-[clamp(34px,10.5vw,46px)] font-semibold leading-none tabular-nums",
          outcome === "won" ? "text-[var(--lime)]" : outcome === "lost" && "text-muted-foreground",
        )}
      >
        {score ?? ""}
      </span>
    </div>
  );
}

function Scoreboard({ fixture }: { fixture: PublicFixture }) {
  const { homeScore: home, awayScore: away } = fixture;
  const known = home != null && away != null;
  const outcome = (mine: number | null, theirs: number | null) =>
    !known || mine === theirs ? "level" : (mine ?? 0) > (theirs ?? 0) ? "won" : "lost";
  return (
    <>
      <h1 id="today-match" className="sr-only">
        {known
          ? `${fixture.homeTeam} ${home}, ${fixture.awayTeam} ${away}`
          : `${fixture.homeTeam} against ${fixture.awayTeam}`}
      </h1>
      <div className="mt-[clamp(2px,1.2dvh,14px)] grid" aria-hidden>
        <TeamRow
          name={fixture.homeTeam}
          crest={fixture.homeCrest}
          score={home}
          outcome={outcome(home, away)}
        />
        <TeamRow
          name={fixture.awayTeam}
          crest={fixture.awayCrest}
          score={away}
          outcome={outcome(away, home)}
        />
      </div>
    </>
  );
}

function StepButton({
  target,
  direction,
  disabled,
  onStep,
}: {
  target: PublicMatch | undefined;
  direction: "earlier" | "later";
  disabled: boolean;
  onStep: (match: PublicMatch) => void;
}) {
  const Icon = direction === "earlier" ? ChevronLeft : ChevronRight;
  if (!target) return <span className="h-11 w-11 shrink-0" aria-hidden />;
  const label = matchLabel(target.fixture) ?? "another match";
  return (
    <HapticButton
      hapticPattern="swipe"
      onClick={() => onStep(target)}
      disabled={disabled}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--pitch-line)] text-muted-foreground hover:text-foreground disabled:opacity-40"
      aria-label={`${direction === "earlier" ? "Earlier" : "Later"} match: ${label}, ${coverageDateLabel(target.coverageDate)}`}
    >
      <Icon className="h-5 w-5" />
    </HapticButton>
  );
}

function ProofSheet({ cards, punditName }: { cards: PublicProofCard[]; punditName: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const card = cards[Math.min(index, cards.length - 1)];
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setIndex(0);
      }}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[color:color-mix(in_oklab,var(--lime)_50%,transparent)] text-mono text-xs text-[var(--lime)]">
            ?
          </span>
          Show me why
        </button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[86dvh] max-w-[560px] rounded-t-[28px] border-[var(--pitch-line)] bg-card px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="grid shrink-0 grid-cols-[1fr_44px] items-start gap-3 px-0 pb-3 pt-4 text-left">
          <div>
            <DrawerTitle className="text-[22px] leading-tight">Show me why</DrawerTitle>
            <DrawerDescription className="mt-1 text-[13px]">
              What {punditName} said, and the match facts behind it.
            </DrawerDescription>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--pitch-line)]"
            aria-label="Close the proof"
          >
            <X className="h-4 w-4" />
          </button>
        </DrawerHeader>
        {/* The sheet is capped at 86dvh. On a short phone or at high zoom a
            long card scrolls inside it, so Back and Next stay reachable. */}
        {card && (
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <article className="rounded-2xl border border-[var(--pitch-line)] bg-[#0d1315] p-4 text-[14px] leading-[1.45]">
              <p className="text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                The claim
              </p>
              <p className="mt-1 line-clamp-4">{card.claim}</p>
              <p className="mt-3 text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                The match fact
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {card.evidence.map((line) => (
                  <li key={line} className="line-clamp-2">
                    {line}
                  </li>
                ))}
              </ul>
              {card.boundary && (
                <>
                  <p className="mt-3 text-mono text-[10px] uppercase tracking-[0.11em] text-[var(--lime)]">
                    What this cannot prove
                  </p>
                  <p className="mt-1 line-clamp-3 text-muted-foreground">{card.boundary}</p>
                </>
              )}
            </article>
          </div>
        )}
        {cards.length > 1 && (
          <div className="mt-3 flex shrink-0 items-center justify-between">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              className="min-h-11 px-2 text-sm font-semibold disabled:opacity-30"
            >
              Back
            </button>
            <span className="text-mono text-[11px] text-muted-foreground">
              {index + 1} of {cards.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(cards.length - 1, value + 1))}
              disabled={index >= cards.length - 1}
              className="min-h-11 px-2 text-sm font-semibold text-[var(--lime)] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export function TodayShowPlayer({
  show,
  matches,
  state,
  pending,
  switchError,
  onOpen,
  onPlay,
  onStep,
  onRetry,
}: {
  show: TodayShow | null;
  matches: PublicMatch[];
  state: PublicToday["state"];
  pending: { dropId: string; pundit: PunditId } | null;
  switchError: string | null;
  /** Open another pundit's show about the match on screen. */
  onOpen: (dropId: string, pundit: PunditId) => void;
  /** The listener pressed play on the show on screen: pin it there. */
  onPlay: (show: TodayShow) => void;
  /** Move to an earlier or later match. */
  onStep: (match: PublicMatch) => void;
  onRetry: () => void;
}) {
  const player = usePlayer();
  const [notice, setNotice] = useState<string | null>(null);
  const episode = useMemo(() => (show ? editionEpisode(show, show.fixture) : null), [show]);
  useEffect(() => setNotice(null), [show?.variant.id]);

  if (!show || !episode) {
    const empty = emptyStateCopy(state);
    return (
      <main className="flex min-h-0 flex-1 flex-col justify-center py-4">
        <p className="eyebrow">Premier League</p>
        <h1 className="mt-3 max-w-[16ch] text-[clamp(30px,9vw,42px)] font-semibold leading-[0.98] tracking-[-0.055em]">
          {empty.title}
        </h1>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
          {empty.body}
        </p>
      </main>
    );
  }

  const madeBy = show.variant.pundit_id;
  const index = matches.findIndex((match) => match.dropId === show.variant.drop_id);
  const match: PublicMatch =
    matches[index] ??
    ({
      dropId: show.variant.drop_id,
      coverageDate: show.coverageDate,
      fixture: show.fixture,
      pundits: [madeBy],
      canonicalPundit: null,
    } satisfies PublicMatch);
  const fixture = show.fixture ?? match.fixture;
  const earlier = index >= 0 ? matches[index + 1] : undefined;
  const later = index > 0 ? matches[index - 1] : undefined;

  const active = player.episode?.id === episode.id;
  const playing = active && player.isPlaying;
  const progress = active ? player.progress : 0;
  const elapsed = progress * episode.durationSec;
  const busy = pending !== null;
  const playerState = busy
    ? "LOADING"
    : playing
      ? "PLAYING"
      : active && player.status === "loading"
        ? "LOADING"
        : progress > 0
          ? "PAUSED"
          : "READY";

  const shown = personality(pending?.dropId === match.dropId ? pending.pundit : madeBy);
  const status = switchError ? (
    <span className="text-[#ff8877]">
      {switchError}{" "}
      <button type="button" onClick={onRetry} className="font-semibold text-[var(--lime)]">
        Retry
      </button>
    </span>
  ) : pending ? (
    `Loading ${personality(pending.pundit).name}...`
  ) : (
    (notice ?? shown.tag)
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* Space shares out evenly between the match, the pundits and the
          player on a tall phone, and collapses to the minimum margins on a
          short one, so nothing needs a scroll. */}
      <div className="flex flex-1 flex-col justify-evenly py-[clamp(4px,1.5dvh,16px)]">
        <section aria-labelledby="today-match">
          <div className="flex items-center justify-between gap-2">
            <StepButton target={earlier} direction="earlier" disabled={busy} onStep={onStep} />
            <p className="eyebrow min-w-0 truncate text-center tracking-[0.14em]">
              {fixture?.competition ?? "Premier League"} ·{" "}
              {coverageDateShortLabel(match.coverageDate)}
            </p>
            <StepButton target={later} direction="later" disabled={busy} onStep={onStep} />
          </div>
          {fixture ? (
            <Scoreboard fixture={fixture} />
          ) : (
            <h1 id="today-match" className="mt-3 text-[28px] font-semibold tracking-tight">
              {coverageDateLabel(match.coverageDate)}
            </h1>
          )}
        </section>

        <section aria-labelledby="pundit-rail-label" className="mt-[clamp(10px,3.6dvh,44px)]">
          <p
            id="pundit-rail-label"
            className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Pick your AI Pundit
          </p>
          <div
            role="group"
            aria-labelledby="pundit-rail-label"
            className="mt-[clamp(6px,1.4dvh,10px)] grid grid-cols-6 gap-[clamp(6px,2vw,10px)]"
          >
            {PERSONALITIES.map((item) => {
              const available = match.pundits.includes(item.id);
              const checked = item.id === madeBy;
              const loading = pending?.pundit === item.id && pending.dropId === match.dropId;
              return (
                <HapticButton
                  key={item.id}
                  hapticPattern="soft"
                  aria-pressed={checked}
                  aria-disabled={!available || busy}
                  aria-label={available ? item.name : `${item.name}, no show for this match`}
                  onClick={() => {
                    if (busy || checked) return;
                    if (!available) {
                      setNotice(`No show from ${item.name} for this match.`);
                      return;
                    }
                    setNotice(null);
                    onOpen(match.dropId, item.id);
                  }}
                  className={cn(
                    "aspect-square w-full rounded-[16px] p-[3px] transition-[opacity,box-shadow]",
                    checked
                      ? "shadow-[0_0_0_2px_var(--lime),0_0_18px_-4px_var(--lime)]"
                      : "shadow-[0_0_0_1px_var(--pitch-line)]",
                    !available && "opacity-30 grayscale",
                    loading && "animate-pulse",
                  )}
                >
                  <PunditAvatar
                    punditId={item.id}
                    editionSeed={match.dropId}
                    className="h-full w-full rounded-[13px] border-0"
                  />
                </HapticButton>
              );
            })}
          </div>
          <div className="mt-[clamp(6px,1.4dvh,12px)] min-h-[40px]" aria-live="polite">
            <p className="text-[17px] font-semibold leading-tight tracking-tight">{shown.name}</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {status}
            </p>
          </div>
        </section>

        <section aria-label="Player" className="mt-[clamp(8px,3dvh,36px)]">
          <div className="grid grid-cols-[64px_1fr] items-center gap-3.5">
            <HapticButton
              hapticPattern="success"
              onClick={() => {
                if (active) {
                  playerStore.toggle();
                  return;
                }
                onPlay(show);
                playerStore.play(episode, [episode]);
              }}
              disabled={busy}
              className="grid h-16 w-16 place-items-center rounded-full border-0 bg-[var(--lime)] text-[#09100c] shadow-[0_10px_28px_rgba(99,255,63,.16)] disabled:opacity-60"
              aria-label={
                playing
                  ? `Pause ${shown.name} on ${matchLabel(fixture) ?? "this match"}`
                  : `Play ${shown.name} on ${matchLabel(fixture) ?? "this match"}`
              }
            >
              {playing ? (
                <Pause className="h-7 w-7" fill="currentColor" />
              ) : (
                <Play className="h-7 w-7 translate-x-[1px]" fill="currentColor" />
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
          {active && player.status === "error" && player.error && (
            <p role="alert" className="mt-2 text-xs text-[#ff8877]">
              {player.error}
            </p>
          )}
          {show.proofCards.length > 0 && (
            <div className="mt-[clamp(0px,1dvh,12px)]">
              <ProofSheet cards={show.proofCards} punditName={personality(madeBy).name} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
