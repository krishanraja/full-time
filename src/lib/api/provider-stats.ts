/** Reading match statistics out of the provider's response.
 *
 *  Labels are matched on letters and digits alone, so a rename that only
 *  changes case, spacing or punctuation cannot silently drop a field.
 *
 *  This is not hypothetical. Expected goals arrived for every match up to
 *  31 August 2026 and for none after it, while shots, possession and corners
 *  kept coming. Those are matched by their display names ("Total Shots");
 *  expected goals alone was matched as "expected_goals". An exact match on one
 *  oddly named field is exactly the shape of failure that produces a clean
 *  break in a single column, with no error raised anywhere. */

export type ProviderStat = { type?: unknown; value?: unknown };

export const statKey = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** The numeric value of one provider statistic, or null when it is absent or
 *  not a number. Percentages arrive as "53%" and are read as 53. */
export function statNumber(stats: readonly ProviderStat[] | null, type: string): number | null {
  const wanted = statKey(type);
  const found = (stats ?? []).find((stat) => statKey(stat.type) === wanted);
  if (!found || found.value == null) return null;
  const value = Number(String(found.value).replace("%", ""));
  return Number.isFinite(value) ? value : null;
}

/** True when the provider sent this statistic at all, whatever its value.
 *
 *  Absent and unreadable are different faults with different fixes, and the
 *  numeric reader cannot tell them apart. */
export function hasStat(stats: readonly ProviderStat[] | null, type: string): boolean {
  const wanted = statKey(type);
  return (stats ?? []).some((stat) => statKey(stat.type) === wanted);
}

/** The labels the provider actually sent, in its own words.
 *
 *  Worth reporting when a wanted statistic is absent: it is the difference
 *  between a field the provider renamed and a field it stopped sending. */
export function statLabels(stats: readonly ProviderStat[] | null): string[] {
  return (stats ?? []).map((stat) => String(stat.type ?? "")).filter(Boolean);
}
