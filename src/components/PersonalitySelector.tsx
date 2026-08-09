import { Check, Lock } from "lucide-react";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

/**
 * Six complete pundit products: each owns a thesis lens, humour system,
 * performance plan, licensed voice and prediction record. Humour may target
 * decisions, contradictions, institutions and football culture, never private
 * lives, protected traits, injuries, grief or personal humiliation.
 */
export const PERSONALITIES = [
  {
    id: "zen",
    name: "The Reporter",
    tag: "Balanced evidence, news judgment and the detail that matters most.",
    sample: "The score is the headline. The shot profile is the correction beneath it.",
  },
  {
    id: "gaffer",
    name: "The Gaffer",
    tag: "Decisions, substitutions, game state and the cost of each choice.",
    sample: "It worked. That does not automatically make it a good decision.",
  },
  {
    id: "stats",
    name: "The Numbers Guy",
    tag: "Probability, xG, variance and process separated from outcome.",
    sample: "The result got the champagne. The process has asked for a recount.",
  },
  {
    id: "romantic",
    name: "The Romantic",
    tag: "Narrative turns, extraordinary actions and the emotional stakes.",
    sample: "Some moments need explaining. That one merely needed witnessing.",
  },
  {
    id: "doomer",
    name: "The Doomer",
    tag: "Failure modes, fragility and the downside hiding inside a good result.",
    sample: "The clean sheet is smiling. The chances conceded are drafting a complaint.",
  },
  {
    id: "banter",
    name: "The Wind-Up",
    tag: "Rivalry, contradiction and sharp judgments that return to evidence.",
    sample: "The victory parade can start after the numbers finish their objection.",
  },
] as const;

export type PersonalityId = (typeof PERSONALITIES)[number]["id"];

export function PersonalitySelector({
  active,
  onChange,
  lockedIds,
  onLockedClick,
  lockLabel = "Free account",
}: {
  active?: PersonalityId;
  onChange?: (id: PersonalityId) => void;
  /** Ids the current tier cannot pick. Shown with a lock; selecting one calls onLockedClick. */
  lockedIds?: readonly string[];
  onLockedClick?: (id: PersonalityId) => void;
  /** What the lock chip says the locked pundits need. */
  lockLabel?: string;
}) {
  const current = active ?? "zen";
  return (
    <div className="flex flex-col gap-2">
      {PERSONALITIES.map((p) => {
        const on = p.id === current;
        const locked = !!lockedIds?.includes(p.id);
        return (
          <HapticButton
            key={p.id}
            hapticPattern="soft"
            onClick={() => (locked ? onLockedClick?.(p.id) : onChange?.(p.id))}
            aria-disabled={locked}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
              on
                ? "border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_8%,transparent)]"
                : "border-[var(--pitch-line)] bg-card hover:border-foreground/20",
              locked && "opacity-60",
            )}
          >
            <div
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                on ? "border-[var(--lime)] bg-[var(--lime)]" : "border-white/30",
              )}
            >
              {on && <Check className="h-3 w-3 text-[var(--primary-foreground)]" strokeWidth={3} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold tracking-tight">{p.name}</div>
                {locked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pitch-line)] px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> {lockLabel}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.tag}</div>
              <div className="mt-1.5 text-xs italic leading-snug text-foreground/75">
                {p.sample}
              </div>
            </div>
          </HapticButton>
        );
      })}
    </div>
  );
}
