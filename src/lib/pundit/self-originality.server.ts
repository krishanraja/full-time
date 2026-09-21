/** What this product has already said, so it does not say it again.
 *
 *  Reads published scripts only. An unpublished variant was never heard, so
 *  repeating it costs nothing, and counting it would make a failed run narrow
 *  the next one's options for no reason. */

import { MEMORABLE_DAYS, type PastLine } from "./self-originality";
import { serviceRest } from "./service-rest.server";

/** The beats worth comparing across days.
 *
 *  The portable line is one sentence a listener could repeat word for word,
 *  which makes it the line most likely to be noticed twice. The hook is the
 *  first thing anyone hears. The other eight beats carry the argument, and an
 *  argument recurring is a persona, not a repetition. */
const COMPARED_BEATS = ["portable_line", "hook"] as const;

type PublishedRow = {
  pundit_id: string;
  beat_outline: Record<string, unknown> | null;
  daily_drops: { coverage_date: string } | { coverage_date: string }[] | null;
};

function coverageDateOf(row: PublishedRow): string | null {
  const drop = Array.isArray(row.daily_drops) ? row.daily_drops[0] : row.daily_drops;
  return drop?.coverage_date ?? null;
}

export function publishedLines(rows: readonly PublishedRow[]): PastLine[] {
  const lines: PastLine[] = [];
  for (const row of rows) {
    const coverageDate = coverageDateOf(row);
    if (!coverageDate || !row.beat_outline) continue;
    for (const beat of COMPARED_BEATS) {
      const text = row.beat_outline[beat];
      if (typeof text !== "string") continue;
      const line = text.trim();
      // Below five words sourceSimilarity returns zero anyway, so a shorter
      // line is weight the caller would carry for nothing.
      if (line.split(/\s+/).length < 5) continue;
      lines.push({ punditId: row.pundit_id, coverageDate, line });
    }
  }
  return lines;
}

/** Every line this product published in the fortnight before `today`.
 *
 *  Never throws. This makes a show less repetitive; it is not allowed to stop
 *  one being made. A failure returns nothing, which is exactly the behaviour
 *  the pipeline has had until now.
 */
export async function loadRecentlyPublishedLines(today: string): Promise<PastLine[]> {
  const since = new Date(
    Date.parse(`${today.slice(0, 10)}T00:00:00Z`) - MEMORABLE_DAYS * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  try {
    const rows = await serviceRest<PublishedRow[]>(
      "pundit_variants?select=pundit_id,beat_outline,daily_drops!inner(coverage_date,published_at)" +
        `&daily_drops.published_at=not.is.null&daily_drops.coverage_date=gte.${since}` +
        `&daily_drops.coverage_date=lt.${today.slice(0, 10)}`,
    );
    return publishedLines(rows);
  } catch (error: unknown) {
    console.error(
      "[self-originality] could not read recently published lines:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}
