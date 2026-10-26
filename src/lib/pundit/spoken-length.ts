import type { PunditId } from "./types";
import { getPersonalityProfile } from "./personality/registry";

export function spokenWordRange(punditId: PunditId) {
  return getPersonalityProfile(punditId).spoken.wordRange;
}

export function spokenDurationRange(punditId?: PunditId) {
  return punditId ? getPersonalityProfile(punditId).spoken.durationRange : { min: 300, max: 480 };
}
