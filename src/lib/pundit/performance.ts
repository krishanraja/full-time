import { getPunditSpec } from "./specs";
import type { PerformanceBeat, PerformanceIntent, PunditId } from "./types";

const ALLOWED_DIRECTIONS = new Set([
  "quiet authority",
  "deliberate pause before the reason",
  "slow down for the number",
  "leave space around the moment",
  "controlled escalation",
  "pause before the sting",
  "return immediately to evidence",
]);

const intentDirection: Partial<Record<PerformanceIntent, string>> = {
  evidence: "slow down for the number",
  punchline: "pause before the sting",
  verdict: "deliberate pause before the reason",
  pivot: "return immediately to evidence",
};

export function performanceBeat(
  punditId: PunditId,
  text: string,
  intent: PerformanceIntent,
  overrides: Partial<Omit<PerformanceBeat, "text" | "intent">> = {},
): PerformanceBeat {
  const spec = getPunditSpec(punditId);
  const direction = overrides.direction ?? intentDirection[intent];
  return {
    text,
    intent,
    pace: overrides.pace ?? spec.performance.defaultPace,
    energy: overrides.energy ?? spec.performance.defaultEnergy,
    pauseBeforeMs: overrides.pauseBeforeMs,
    emphasis: overrides.emphasis,
    direction: direction && ALLOWED_DIRECTIONS.has(direction) ? direction : undefined,
  };
}

export function assertPerformanceIdentity(plan: readonly PerformanceBeat[], displayScript: string) {
  const renderedText = plan
    .map((beat) => beat.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const display = displayScript.replace(/\s+/g, " ").trim();
  return {
    passed: renderedText === display,
    renderedText,
    failure:
      renderedText === display ? undefined : "Performance plan changes the approved script text.",
  };
}

export function renderTtsDirections(plan: readonly PerformanceBeat[]): string[] {
  return plan.map((beat) => {
    const parts = [
      `intent=${beat.intent}`,
      `pace=${beat.pace}`,
      `energy=${beat.energy}`,
      beat.pauseBeforeMs
        ? `pause_before_ms=${Math.min(1500, Math.max(0, beat.pauseBeforeMs))}`
        : "",
      beat.direction && ALLOWED_DIRECTIONS.has(beat.direction) ? `direction=${beat.direction}` : "",
    ].filter(Boolean);
    return parts.join("; ");
  });
}
