import type { PunditId, PunditSpec } from "./types";
import { PUNDIT_IDS } from "./types";
import { productSpecFor } from "./personality/registry";

// Compatibility API; all persona fields have one owner in the pinned product core.
export const PUNDIT_SPECS: Record<PunditId, PunditSpec> = Object.fromEntries(
  PUNDIT_IDS.map((id) => [id, productSpecFor(id)]),
) as Record<PunditId, PunditSpec>;

export function getPunditSpec(id: PunditId): PunditSpec {
  return productSpecFor(id);
}
