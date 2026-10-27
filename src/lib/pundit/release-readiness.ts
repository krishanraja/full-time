import { spokenDurationRange } from "./spoken-length";
import type { PunditId } from "./types";

/** Reviews store whole seconds; count only a whole current-format recording,
 * never a short excerpt of a longer show. Historical reviews stay stored. */
export function isFullAlphaAudioReview(
  sampleSeconds: number,
  variant?: { pundit_id: PunditId; audio_duration_sec: number | null },
) {
  if (!variant || variant.audio_duration_sec === null) return false;
  const duration = variant.audio_duration_sec;
  const range = spokenDurationRange(variant.pundit_id);
  return (
    Number.isFinite(duration) &&
    Number.isFinite(sampleSeconds) &&
    duration >= range.min &&
    duration <= range.max &&
    sampleSeconds >= Math.ceil(duration)
  );
}

export type ReleaseGate = {
  name: string;
  passed: boolean;
  metric: number | string | boolean;
  required: number | string | boolean;
  detail: string;
};

export function median(values: readonly number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function percentage(values: readonly boolean[]) {
  return values.length ? values.filter(Boolean).length / values.length : 0;
}

export function areConsecutiveDates(values: readonly string[]) {
  if (!values.length) return false;
  const ordered = [...new Set(values)].sort();
  for (let index = 1; index < ordered.length; index++) {
    const prior = new Date(`${ordered[index - 1]}T12:00:00Z`);
    prior.setUTCDate(prior.getUTCDate() + 1);
    if (prior.toISOString().slice(0, 10) !== ordered[index]) return false;
  }
  return true;
}
