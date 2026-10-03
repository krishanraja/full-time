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

/** How many fixtures carried a statistic on one day.
 *
 *  One row per statistic per day, not per fixture: a field the provider drops
 *  is dropped for every fixture that day, so a per-fixture ledger would be
 *  twelve times the rows and tell you nothing extra. */
export type StatPresence = {
  /** The column this statistic is stored in, e.g. "xg". */
  statKey: string;
  /** The label we ask the provider for, e.g. "expected_goals". */
  providerLabel: string;
  fixturesSeen: number;
  fixturesPresent: number;
};

export type PresenceAlarm = {
  statKey: string;
  /** withdrawn: the provider sent nothing we did not already recognise, so the
   *  field is gone. renamed: it sent a label we do not map, so the field is
   *  probably still there under another name. restored: it is back.
   *
   *  The difference matters because the fixes are opposite. A withdrawal needs
   *  the evidence pack to stop depending on the figure; a rename needs one
   *  string changed. Expected goals cost five days precisely because nothing
   *  told these apart. */
  kind: "withdrawn" | "renamed" | "restored";
  detail: string;
};

/** What changed between two days of provider statistics.
 *
 *  Silence is the failure mode this exists for. Expected goals arrived for
 *  every match up to 31 August 2026 and for none after it, while shots,
 *  possession and corners kept coming, and nothing raised for five days. */
export function statPresenceDelta(
  yesterday: readonly StatPresence[],
  /** The complete ledger for today: one row per statistic the ingest asks for,
   *  present or not. A partial ledger makes labels we do map look unmapped and
   *  reports a withdrawal as a rename, which is the safe direction to be wrong
   *  in - a rename asks a human to look. */
  today: readonly StatPresence[],
  /** Every label the provider sent today, in its own words. */
  labelsSentToday: readonly string[] = [],
): PresenceAlarm[] {
  const before = new Map(yesterday.map((row) => [row.statKey, row]));
  const mapped = new Set(today.map((row) => statKey(row.providerLabel)));
  const unmapped = labelsSentToday.filter((label) => !mapped.has(statKey(label)));

  const alarms: PresenceAlarm[] = [];
  for (const row of today) {
    // A day with no fixtures says nothing about the provider.
    if (row.fixturesSeen === 0) continue;
    const was = before.get(row.statKey);
    if (!was || was.fixturesPresent === 0) {
      if (was && row.fixturesPresent > 0) {
        alarms.push({
          statKey: row.statKey,
          kind: "restored",
          detail: `${row.providerLabel} is being sent again, for ${row.fixturesPresent} of ${row.fixturesSeen} fixtures.`,
        });
      }
      continue;
    }
    if (row.fixturesPresent > 0) continue;
    alarms.push({
      statKey: row.statKey,
      kind: unmapped.length ? "renamed" : "withdrawn",
      detail: unmapped.length
        ? `${row.providerLabel} was sent for ${was.fixturesPresent} fixtures yesterday and none today, and the provider sent labels we do not map: ${unmapped.join(", ")}.`
        : `${row.providerLabel} was sent for ${was.fixturesPresent} fixtures yesterday and none today, and every label the provider sent is one we already map.`,
    });
  }
  return alarms;
}
