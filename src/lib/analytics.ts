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
//   - Never throw, never block. An analytics failure must not be able to
//     break playback.
//
// The loader is async, so `window.posthog` does not exist for the first few
// hundred milliseconds of a page. Events fired from a mount effect lose that
// race: `signin_gate_shown` on `/archive` was observed being dropped for
// exactly this reason. So an event that arrives too early is held and flushed
// once PostHog appears, rather than discarded. The queue is bounded and gives
// up, so an ad blocker (where PostHog never appears) cannot grow it forever
// or leave a timer running.
//
// Event taxonomy lives in `docs/09-growth.md`. Add an event only if it
// changes a decision.

type PostHog = {
  capture?: (event: string, properties?: Record<string, unknown>) => void;
};

type Queued = { event: string; props?: Record<string, unknown> };

const MAX_PENDING = 50;
const POLL_MS = 250;
const GIVE_UP_MS = 30_000;

let pending: Queued[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let waited = 0;

function posthog(): PostHog | undefined {
  return (window as unknown as { posthog?: PostHog }).posthog;
}

function send(event: string, props?: Record<string, unknown>): boolean {
  const ph = posthog();
  if (!ph || typeof ph.capture !== "function") return false;
  ph.capture(event, props);
  return true;
}

function stopWaiting() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startWaiting() {
  if (timer !== null) return;
  waited = 0;
  timer = setInterval(() => {
    waited += POLL_MS;
    try {
      const ph = posthog();
      if (ph && typeof ph.capture === "function") {
        const queued = pending;
        pending = [];
        stopWaiting();
        for (const q of queued) send(q.event, q.props);
        return;
      }
    } catch {
      pending = [];
      stopWaiting();
      return;
    }
    // PostHog is not coming (ad blocker, offline, blocked host). Drop the
    // backlog and stop burning a timer.
    if (waited >= GIVE_UP_MS) {
      pending = [];
      stopWaiting();
    }
  }, POLL_MS);
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (send(event, props)) return;
    if (pending.length < MAX_PENDING) pending.push({ event, props });
    startWaiting();
  } catch {
    /* analytics is never allowed to break the product */
  }
}
