import { Check } from "lucide-react";
import { HapticButton } from "./HapticButton";
import { cn } from "../lib/utils";

const VOICES = [
  { id: "classic", name: "Classic commentator", blurb: "Warm, theatrical, big-match energy." },
  { id: "wit", name: "Dry English wit", blurb: "Half a smirk, half a sigh. Pub-ready." },
  { id: "concise", name: "Ultra concise", blurb: "Sixty seconds. No fluff. Just facts." },
] as const;

type VoiceId = (typeof VOICES)[number]["id"];

export function VoiceSelector({
  active,
  onChange,
}: {
  active?: VoiceId;
  onChange?: (id: VoiceId) => void;
}) {
  const current = active ?? "classic";
  return (
    <div className="flex flex-col gap-2">
      {VOICES.map((v) => {
        const on = v.id === current;
        return (
          <HapticButton
            key={v.id}
            hapticPattern="soft"
            onClick={() => onChange?.(v.id)}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
              on
                ? "border-[color:color-mix(in_oklab,var(--lime)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--lime)_8%,transparent)]"
                : "border-[var(--pitch-line)] bg-card hover:border-foreground/20",
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
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">{v.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{v.blurb}</div>
            </div>
          </HapticButton>
        );
      })}
    </div>
  );
}
