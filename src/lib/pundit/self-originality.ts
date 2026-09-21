/** Repetition the product produces itself.
 *
 *  research-originality.ts asks whether a script is too close to someone
 *  else's writing. Nothing asks whether it is too close to ours. There are two
 *  ways for that to happen and the live pipeline has never checked either.
 *
 *  Across days: nothing stops today's Doomer reaching the same portable line
 *  it reached last Tuesday. The legacy angle engine had a recency penalty for
 *  exactly this - minus twenty-five if the angle ran in the last three days,
 *  minus ten within fourteen - and that engine is on the dead path. The live
 *  one replaced it with nothing.
 *
 *  Across a single day: six pundits share one evidence pack and one claim set,
 *  and are never compared to each other. On 2026-09-04 the claim laboratory
 *  returned thirty-five claims holding about ten ideas, six writers built the
 *  same argument, and five were failed for a truism. All six failing together
 *  is a fact about the shared input, and nothing measured it.
 *
 *  This module only measures. It does not fail a variant. A persona is
 *  supposed to sound like itself, so self-similarity is a reason to steer a
 *  writer away from a line before it writes, not a reason to refuse the script
 *  after it has been paid for. */

import { maxSourceSimilarity, sourceSimilarity } from "./research-originality";

export type PastLine = {
  punditId: string;
  /** ISO date of the drop the line was published in. */
  coverageDate: string;
  line: string;
};

/** The legacy angle engine's shape, kept because it was tuned against real
 *  output rather than invented here: three days is "that was this week", two
 *  weeks is "a listener might still remember". Beyond that a pundit is allowed
 *  its recurring habits, which is what having a persona means. */
export const RECENT_DAYS = 3;
export const MEMORABLE_DAYS = 14;

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - start) / 86_400_000);
}

/** How much a repeat costs, by how recently it happened. Zero means the pundit
 *  is free to sound like itself. */
export function recencyWeight(daysAgo: number): number {
  if (daysAgo < 0) return 0;
  if (daysAgo <= RECENT_DAYS) return 1;
  if (daysAgo <= MEMORABLE_DAYS) return 0.4;
  return 0;
}

export type RepetitionHit = {
  /** The line this pundit already used. */
  line: string;
  coverageDate: string;
  similarity: number;
  daysAgo: number;
  /** similarity scaled by how recently it ran. */
  weight: number;
};

/** Lines this pundit has used recently that today's line is close to.
 *
 *  Scoped to one pundit on purpose. Two personas reaching a similar phrase on
 *  the same evidence is a different problem, handled below, and conflating
 *  them would punish a persona for having a voice. */
export function repeatedLines(
  punditId: string,
  line: string,
  past: readonly PastLine[],
  today: string,
  threshold = 0.5,
): RepetitionHit[] {
  return past
    .filter((entry) => entry.punditId === punditId)
    .map((entry) => {
      const daysAgo = daysBetween(entry.coverageDate, today);
      return {
        line: entry.line,
        coverageDate: entry.coverageDate,
        similarity: sourceSimilarity(line, entry.line),
        daysAgo,
        weight: sourceSimilarity(line, entry.line) * recencyWeight(daysAgo),
      };
    })
    .filter((hit) => hit.similarity >= threshold && hit.weight > 0)
    .sort((left, right) => right.weight - left.weight);
}

/** The lines to put in front of a writer so it does not reach for them again.
 *
 *  Prevention, not rejection. Showing a writer a line and then refusing it is
 *  a trap rather than a gate, and a refused script costs a repair round that a
 *  sentence in the prompt costs nothing. */
export function linesToAvoid(
  punditId: string,
  past: readonly PastLine[],
  today: string,
  limit = 8,
): string[] {
  return past
    .filter(
      (entry) =>
        entry.punditId === punditId && recencyWeight(daysBetween(entry.coverageDate, today)) > 0,
    )
    .sort(
      (left, right) =>
        daysBetween(left.coverageDate, today) - daysBetween(right.coverageDate, today),
    )
    .slice(0, limit)
    .map((entry) => entry.line);
}

export type VariantEcho = {
  left: string;
  right: string;
  similarity: number;
};

/** Pairs of today's pundits that wrote the same argument.
 *
 *  Reported, never failed. Six pundits converging is a fact about the claim
 *  set they were all given, so the fix is upstream in the claim laboratory,
 *  and failing the writers would be blaming them for their input. */
export function convergentVariants(
  variants: ReadonlyArray<{ punditId: string; text: string }>,
  threshold = 0.5,
): VariantEcho[] {
  const echoes: VariantEcho[] = [];
  for (let left = 0; left < variants.length; left++) {
    for (let right = left + 1; right < variants.length; right++) {
      const similarity = sourceSimilarity(variants[left].text, variants[right].text);
      if (similarity >= threshold) {
        echoes.push({
          left: variants[left].punditId,
          right: variants[right].punditId,
          similarity,
        });
      }
    }
  }
  return echoes.sort((a, b) => b.similarity - a.similarity);
}

/** One number for how much of today's writing the product has already
 *  published, for the run record.
 *
 *  It does not reach zero between two English sentences. sourceSimilarity
 *  takes the longest contiguous run of shared words over sixteen, so a single
 *  shared word is already 0.0625. Compare scripts to each other, not to zero.
 *  Zero means only that this pundit has published nothing recently. */
export function selfRepetitionScore(
  punditId: string,
  script: string,
  past: readonly PastLine[],
  today: string,
): number {
  const lines = linesToAvoid(punditId, past, today, 64);
  if (!lines.length) return 0;
  return Number(maxSourceSimilarity(script, lines).toFixed(3));
}
