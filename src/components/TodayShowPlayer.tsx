import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type {
  PublicFixture,
  PublicMatch,
  PublicProofCard,
  PublicToday,
} from "@/lib/api/editorial-public.server";
import { coverageDateLabel, coverageDateShortLabel } from "@/lib/london-date";
import { playerStore, usePlayer } from "@/lib/player-store";
import { clubDisplayName } from "@/lib/premier-league";
import { PUNDIT_HUES } from "@/lib/pundit-cover";
import type { PunditId } from "@/lib/pundit/types";
import { editionEpisode, matchLabel, type TodayShow } from "@/lib/today-show-model";
import { cn } from "@/lib/utils";
import { Backdrop } from "./Backdrop";
import { CrestDisc } from "./CrestDisc";
import { HapticButton } from "./HapticButton";
import { MatchAtmosphere } from "./MatchAtmosphere";
import { MatchSeal } from "./MatchSeal";
import { PERSONALITIES } from "./PersonalitySelector";
import { PunditCover } from "./PunditCover";
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
 *
 * Ruling (Krish, 2026-10-02): adopt the premium design. The score sits in an
 * engraved seal woven in the two clubs' colours, the clubs' floodlight comes
 * in from each side, and each AI Pundit is a printed cover for this match.
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

/** The longest word in a club's name, in em of Instrument Serif. Measured
 *  at 0.33 to 0.44em a character for long words; 0.45 keeps a margin. */
function longestWordEm(name: string) {
  return Math.max(...name.split(/\s+/).map((word) => word.length)) * 0.45;
}

function Side({ name, crest, lost }: { name: string; crest?: string | null; lost: boolean }) {
  const display = clubDisplayName(name);
  return (
    // A width container: a long name wraps at its spaces, and its longest
    // word sets a ceiling on the size (cqi), so "Bournemouth" on a 320px
    // phone shrinks to fit rather than pushing the seal off-centre.
    <div className="flex min-w-0 flex-col items-center gap-[clamp(7px,1.3dvh,11px)] text-center [container-type:inline-size]">
      <CrestDisc
        club={name}
        crest={crest}
        ringWidth={3}
        className="h-[max(44px,calc(var(--seal)*0.3))] w-[max(44px,calc(var(--seal)*0.3))]"
      />
      <span
        className={cn(
          "serif max-w-full leading-[1.02] [text-shadow:0_1px_10px_rgba(12,9,7,0.7)] [text-wrap:balance]",
          lost && "text-ink-2",
        )}
        style={{
          fontSize: `min(clamp(17px, calc(var(--seal) * 0.102), 21px), calc(100cqi / ${longestWordEm(display).toFixed(2)}))`,
        }}
      >
        {display}
      </span>
    </div>
  );
}

/** The scoreboard: both clubs either side of the seal that holds the score.
 *  The visible board is decorative; the h1 says the same thing in words.
 *  Memoised: Today re-renders on every playback tick and the board only
 *  changes with the match. */
const Board = memo(function Board({ fixture, seed }: { fixture: PublicFixture; seed: string }) {
  const seal = useRef<HTMLDivElement>(null);
  const { homeScore: home, awayScore: away } = fixture;
  const known = home != null && away != null;
  return (
    <>
      <h1 id="today-match" className="sr-only">
        {known
          ? `${fixture.homeTeam} ${home}, ${fixture.awayTeam} ${away}`
          : `${fixture.homeTeam} against ${fixture.awayTeam}`}
      </h1>
      <MatchAtmosphere
        seed={seed}
        homeTeam={fixture.homeTeam}
        awayTeam={fixture.awayTeam}
        homeScore={home}
        awayScore={away}
        sealRef={seal}
      />
      {/* The seal takes the height the board section was left (cqh), capped
          by the width, so it is as large as the screen allows and never
          pushes the player off a short one. */}
      {/* minmax(0,1fr): a plain 1fr column grows to fit a name that will
          not wrap, which pushed the seal off-centre and, at 320px, made the
          screen scroll sideways. Below about 100px of height (a phone on its
          side) there is no room for the seal, so the score goes on one line. */}
      <div
        className="relative grid w-full grid-cols-[minmax(0,1fr)_var(--seal)_minmax(0,1fr)] items-center px-0 [--seal:min(47vw,88cqh,248px)] [@container(max-height:100px)]:hidden"
        aria-hidden
      >
        <Side name={fixture.homeTeam} crest={fixture.homeCrest} lost={known && home! < away!} />
        <div ref={seal} className="relative">
          <MatchSeal
            seed={seed}
            homeTeam={fixture.homeTeam}
            awayTeam={fixture.awayTeam}
            homeScore={home}
            awayScore={away}
            className="w-[var(--seal)]"
          />
        </div>
        <Side name={fixture.awayTeam} crest={fixture.awayCrest} lost={known && away! < home!} />
      </div>
      <p
        className="serif hidden w-full items-center justify-center gap-[0.4em] whitespace-nowrap text-[clamp(18px,4.4vw,26px)] leading-none [@container(max-height:100px)]:flex"
        aria-hidden
      >
        <span className="min-w-0 truncate">{clubDisplayName(fixture.homeTeam)}</span>
        <span className="text-[1.3em] [font-variant-numeric:lining-nums]">
          {known ? `${home}–${away}` : "v"}
        </span>
        <span className="min-w-0 truncate">{clubDisplayName(fixture.awayTeam)}</span>
      </p>
    </>
  );
});

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
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-2 hover:text-foreground disabled:opacity-40"
      aria-label={`${direction === "earlier" ? "Earlier" : "Later"} match: ${label}, ${coverageDateLabel(target.coverageDate)}`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
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
          className="serif inline-flex min-h-11 items-center px-3.5 text-[clamp(17px,2.5dvh,19px)] italic text-ink-2 hover:text-foreground"
        >
          <span className="border-b border-[rgb(241_233_218/28%)] pb-px">Show me why</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[86dvh] max-w-[560px] rounded-t-[10px] border-[var(--pitch-line)] bg-card px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="grid shrink-0 grid-cols-[1fr_44px] items-start gap-3 px-0 pb-3 pt-4 text-left">
          <div>
            <DrawerTitle className="serif text-[28px] font-normal leading-tight">
              Show me why
            </DrawerTitle>
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
            <article className="rounded-[3px] border border-[var(--pitch-line)] bg-[var(--ground-2)] p-4 text-[14px] leading-[1.45]">
              <p className="text-[12px] font-semibold tracking-[0.06em] text-ink-2">THE CLAIM</p>
              <p className="serif mt-1 line-clamp-4 text-[19px] leading-snug">{card.claim}</p>
              <p className="mt-3 text-[12px] font-semibold tracking-[0.06em] text-ink-2">
                THE MATCH FACT
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
                  <p className="mt-3 text-[12px] font-semibold tracking-[0.06em] text-ink-2">
                    WHAT THIS CANNOT PROVE
                  </p>
                  <p className="mt-1 line-clamp-3 text-ink-2">{card.boundary}</p>
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
            <span className="text-[12px] text-ink-2 [font-variant-numeric:tabular-nums]">
              {index + 1} of {cards.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(cards.length - 1, value + 1))}
              disabled={index >= cards.length - 1}
              className="min-h-11 px-2 text-sm font-semibold text-foreground disabled:opacity-30"
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
        <h1 className="serif mt-2 max-w-[14ch] text-[clamp(38px,11vw,50px)] leading-[0.98]">
          {empty.title}
        </h1>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-ink-2">{empty.body}</p>
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
      <button type="button" onClick={onRetry} className="font-semibold text-foreground underline">
        Retry
      </button>
    </span>
  ) : pending ? (
    `Loading ${personality(pending.pundit).name}...`
  ) : (
    (notice ?? shown.tag)
  );

  const partial = match.pundits.length < PERSONALITIES.length;
  const hue = PUNDIT_HUES[pending?.dropId === match.dropId ? pending.pundit : madeBy];

  return (
    <main className="flex min-h-0 flex-1 flex-col" aria-labelledby="today-match">
      {/* The selected AI Pundit's paper washes the lower ground, faintly. */}
      <Backdrop>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(110% 34% at 50% 80%, color-mix(in srgb, ${hue} 12%, transparent), transparent 72%)`,
          }}
        />
      </Backdrop>

      <div className="mt-[clamp(0px,0.6dvh,6px)] flex h-11 shrink-0 items-center justify-between">
        <StepButton target={earlier} direction="earlier" disabled={busy} onStep={onStep} />
        <p className="min-w-0 truncate whitespace-nowrap text-center text-[14px] text-ink-2">
          <b className="font-semibold text-foreground">
            {fixture?.competition ?? "Premier League"}
          </b>
          <span className="px-[0.4em]">·</span>
          {coverageDateShortLabel(match.coverageDate)}
        </p>
        <StepButton target={later} direction="later" disabled={busy} onStep={onStep} />
      </div>

      {/* The match takes whatever height is left, so the seal grows on a tall
          phone and nothing needs a scroll on a short one. A size container:
          its own content never pushes the column taller. */}
      <section className="flex min-h-0 flex-[1_1_0] items-center justify-center [container-type:size]">
        {fixture ? (
          <Board fixture={fixture} seed={match.dropId} />
        ) : (
          <h1 id="today-match" className="serif text-[34px]">
            {coverageDateLabel(match.coverageDate)}
          </h1>
        )}
      </section>

      <section aria-labelledby="pundit-rail-label" className="shrink-0">
        <h2
          id="pundit-rail-label"
          className="serif mb-[clamp(8px,1.4dvh,12px)] text-[clamp(17px,2.6dvh,20px)] italic"
        >
          Pick your AI Pundit
          {partial && (
            <span className="text-[#b3a690] [word-spacing:0.1em]">
              {" · "}
              {match.pundits.length} on this match
            </span>
          )}
        </h2>
        <div
          role="group"
          aria-labelledby="pundit-rail-label"
          className="grid grid-cols-6 gap-[7px]"
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
                  "relative h-[clamp(48px,8.8dvh,68px)] w-full rounded-[2px]",
                  "after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:rounded-[2px]",
                  checked &&
                    "shadow-[0_8px_20px_rgba(0,0,0,0.4)] after:border-2 after:border-foreground",
                  !available && "after:border after:border-[#3a332c]",
                  loading && "animate-pulse",
                )}
              >
                <PunditCover
                  punditId={item.id}
                  seed={match.dropId}
                  fixture={fixture}
                  className={cn(
                    available && !checked && "[&>svg]:[filter:saturate(0.62)_brightness(0.9)]",
                    !available && "[filter:grayscale(1)_brightness(0.35)]",
                  )}
                />
              </HapticButton>
            );
          })}
        </div>
        <div
          className="mt-[clamp(14px,2.5dvh,22px)] min-h-[52px] [@media(max-height:600px)]:mt-2"
          aria-live="polite"
        >
          <p className="serif text-[clamp(25px,4dvh,31px)] leading-[1.02]">
            {shown.name.startsWith("The ") ? (
              <>
                <i className="pr-[0.04em] text-ink-2">The</i> {shown.name.slice(4)}
              </>
            ) : (
              shown.name
            )}
          </p>
          <p className="mt-[clamp(2px,0.5dvh,5px)] line-clamp-2 text-[clamp(13.5px,2dvh,15px)] leading-[1.3] text-ink-2">
            {status}
          </p>
        </div>
      </section>

      <section
        aria-label="Player"
        className="mt-[clamp(10px,3dvh,26px)] flex shrink-0 items-center gap-4 [@media(max-height:600px)]:mt-2"
      >
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
          className="grid h-[clamp(52px,7.6dvh,58px)] w-[clamp(52px,7.6dvh,58px)] shrink-0 place-items-center rounded-full border-0 bg-[var(--lime)] text-[var(--primary-foreground)] disabled:opacity-60"
          aria-label={
            playing
              ? `Pause ${shown.name} on ${matchLabel(fixture) ?? "this match"}`
              : `Play ${shown.name} on ${matchLabel(fixture) ?? "this match"}`
          }
        >
          {playing ? (
            <Pause className="h-[38%] w-[38%]" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play
              className="h-[38%] w-[38%] translate-x-[1px]"
              fill="currentColor"
              strokeWidth={0}
            />
          )}
        </HapticButton>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-semibold tracking-[0.07em]">{playerState}</span>
            <span className="text-[14px] text-ink-2 [font-variant-numeric:tabular-nums]">
              <b className="font-medium text-foreground">{fmt(elapsed)}</b> /{" "}
              {fmt(episode.durationSec)}
            </span>
          </div>
          <input
            className="today-progress -mb-[13px] -mt-[9px] w-full"
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
      </section>
      {active && player.status === "error" && player.error && (
        <p role="alert" className="mt-2 shrink-0 text-xs text-[#ff8877]">
          {player.error}
        </p>
      )}
      <div className="mt-[clamp(2px,1.2dvh,10px)] flex h-11 shrink-0 justify-center [@media(max-height:600px)]:mt-0">
        {show.proofCards.length > 0 && (
          <ProofSheet cards={show.proofCards} punditName={personality(madeBy).name} />
        )}
      </div>
      <div className="shrink-0 basis-[clamp(4px,2dvh,18px)] [@media(max-height:600px)]:basis-1" />
    </main>
  );
}
