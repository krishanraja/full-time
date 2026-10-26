import type { PunditId } from "./types";
import {
  getPersonalityProfile,
  getPersonalityRelease,
  getSharedPersonality,
} from "./personality/registry";

export const LISTENING_STANDARD_VERSION = getPersonalityRelease().id;

export function spokenStyleBrief(punditId: PunditId): string {
  const common = getSharedPersonality();
  return `${common.productSpeech} ${common.crossSurfaceSpeech} ${getPersonalityProfile(punditId).spoken.productBrief}`;
}

export function spokenRateRange(punditId?: PunditId) {
  return punditId ? getPersonalityProfile(punditId).spoken.rateRange : { min: 110, max: 190 };
}
