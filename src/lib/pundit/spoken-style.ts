import type { PunditId } from "./types";
import {
  getPersonalityProfile,
  getPersonalityRelease,
  getSharedPersonality,
} from "./personality/registry";

export const LISTENING_STANDARD_VERSION = getPersonalityRelease().id;

export function spokenStyleBrief(punditId: PunditId): string {
  const common = getSharedPersonality();
  const examples = common.spokenWriting
    ? ` ${common.spokenWriting.referenceUse}\n${common.spokenWriting.examples
        .map(
          ({ written, spoken, lesson }) =>
            `Written: ${JSON.stringify(written)}\nSpoken: ${JSON.stringify(spoken)}\nLesson: ${lesson}`,
        )
        .join("\n")}`
    : "";
  return `${common.productSpeech} ${common.crossSurfaceSpeech} ${getPersonalityProfile(punditId).spoken.productBrief}${examples}`;
}

export function spokenRateRange(punditId?: PunditId) {
  return punditId ? getPersonalityProfile(punditId).spoken.rateRange : { min: 110, max: 190 };
}
