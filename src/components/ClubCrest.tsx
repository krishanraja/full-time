import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A club crest from the provider's public imagery.
 *
 * Ruling (Krish, 2026-09-27): show club crests, accepting the trademark
 * exposure; docs/11-legal.md records it. The image is decorative beside the
 * club's name, so it carries no alt text, and a crest that fails to load
 * leaves an empty square of the same size (or the `fallback`) rather than a
 * broken-image icon or a layout shift.
 */
export function ClubCrest({
  src,
  className,
  fallback = null,
}: {
  src?: string | null;
  className?: string;
  /** Shown when there is no crest or it fails to load. */
  fallback?: ReactNode;
}) {
  // Keyed on the URL, so a new crest gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src != null && failedSrc === src;
  const image = useRef<HTMLImageElement>(null);
  // An image rendered on the server can fail before React hydrates, and then
  // `onError` never fires and the browser's broken-image icon stays. Check
  // once on mount as well.
  useEffect(() => {
    const element = image.current;
    if (src && element?.complete && element.naturalWidth === 0) setFailedSrc(src);
  }, [src]);
  return (
    <span className={cn("relative block shrink-0", className)} aria-hidden>
      {src && !failed ? (
        // Keyed on the URL: reusing one element for a new crest leaves the
        // previous club's crest on screen until the new image arrives, which
        // put Man City's crest beside Tottenham after stepping to their match.
        <img
          key={src}
          ref={image}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
