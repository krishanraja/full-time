import type { PunditId } from "./types";

/** Krish, 21 October 2026: Reporter editions may be concise. The other
 * personas retain their existing full-show range. Shared by writer and gate. */
export function spokenWordRange(punditId: PunditId) {
  return punditId === "zen" ? { min: 550, max: 800 } : { min: 750, max: 1100 };
}

export function spokenDurationRange(punditId?: PunditId) {
  return punditId === "zen" ? { min: 180, max: 360 } : { min: 300, max: 480 };
}
