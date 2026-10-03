import type { PunditId } from "@/lib/pundit/types";

/** Which pundit's show to open a match on: the listener's own when they made
 *  one, then the drop's canonical pundit, then the first that did. Never a
 *  pundit without a published show for this match, and never a different
 *  match: that swap is what made Today impossible to follow. Shared by the
 *  server, which picks the first show, and Today, which steps between
 *  matches. */
export function editionPunditFor(
  match: { pundits: readonly PunditId[]; canonicalPundit: PunditId | null },
  requested: PunditId,
): PunditId | null {
  if (match.pundits.includes(requested)) return requested;
  if (match.canonicalPundit && match.pundits.includes(match.canonicalPundit)) {
    return match.canonicalPundit;
  }
  return match.pundits[0] ?? null;
}
