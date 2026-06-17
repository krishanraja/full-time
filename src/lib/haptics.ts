// Tiny haptics helper. Uses Vibration API where available, no-ops otherwise.
// TODO: on iOS Safari this is a no-op. Wire native haptics via Capacitor when we ship a wrapper.

type Pattern = "tap" | "soft" | "double" | "success" | "swipe";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  soft: 4,
  double: [10, 30, 10],
  success: [6, 40, 14],
  swipe: 6,
};

export function haptic(pattern: Pattern = "tap") {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(PATTERNS[pattern]);
    } catch {
      /* graceful fallback */
    }
  }
}
