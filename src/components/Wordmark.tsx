import wordmarkUrl from "@/assets/full-time-wordmark-trim.png";

/**
 * The real Full Time wordmark (lime FULL_TIME, transparent background). Bundled by
 * Vite so it resolves on any host. Size it via a height class on `className`.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <img
      src={wordmarkUrl}
      alt="Full Time"
      className={className}
      draggable={false}
    />
  );
}

/** The stopwatch + football monogram. Served from /icon-192.png so it resolves on any host. */
export function LogoMark({ className = "" }: { className?: string }) {
  return <img src="/icon-192.png" alt="" aria-hidden draggable={false} className={className} />;
}
