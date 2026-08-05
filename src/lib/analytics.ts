// Product analytics. One vendor, one call site shape, one file to change if
// the vendor changes again.
//
// History worth knowing: every custom event in this app used to call
// `window.plausible?.()` directly, in five separate hand-rolled helpers.
// Plausible only loaded when `VITE_PLAUSIBLE_DOMAIN` was set, that variable
// was never set in any environment, so every product event silently no-opped
// while the code read as fully instrumented. PostHog is what actually loads
// (see `routes/__root.tsx`), so that is where events go now.
//
// Safety contract, because this runs inside the audio player and during
// service-worker subscription:
//   - No-op on the server. TanStack Start renders these modules under Nitro
//     where `window` does not exist.
//   - No-op if PostHog has not loaded yet. The loader is async, so
//     `window.posthog` is undefined for the first moments of a page, and
//     stays undefined forever behind an ad blocker.
//   - Never throw. An analytics failure must not be able to break playback.
//
// Event taxonomy lives in `docs/09-growth.md`. Add an event only if it
// changes a decision.

type PostHog = {
  capture?: (event: string, properties?: Record<string, unknown>) => void;
};

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const posthog = (window as unknown as { posthog?: PostHog }).posthog;
    posthog?.capture?.(event, props);
  } catch {
    /* analytics is never allowed to break the product */
  }
}
