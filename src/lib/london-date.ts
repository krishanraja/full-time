const LONDON = "Europe/London";

function dateParts(date: Date, timeZone = LONDON) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function londonDate(date = new Date()): string {
  const { year, month, day } = dateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return shifted.toISOString().slice(0, 10);
}

function zonedLocalUtc(isoDate: string, hour: number, minute: number, timeZone = LONDON): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  let instant = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Resolve the zone offset iteratively. This is stable across both GMT and
  // BST boundaries because the requested local time is always midnight.
  for (let pass = 0; pass < 3; pass++) {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(formatted.find((part) => part.type === type)?.value ?? 0);
    const representedAsUtc = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second"),
    );
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    instant += desiredAsUtc - representedAsUtc;
  }
  return new Date(instant);
}

export function londonDayBounds(isoDate: string) {
  return {
    start: zonedLocalUtc(isoDate, 0, 0),
    end: zonedLocalUtc(addCalendarDays(isoDate, 1), 0, 0),
  };
}

export function londonLocalTime(isoDate: string, hour: number, minute = 0) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("Invalid London hour.");
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Invalid London minute.");
  }
  return zonedLocalUtc(isoDate, hour, minute);
}

export function currentCoverageDate(date = new Date()): string {
  return addCalendarDays(londonDate(date), -1);
}

export function londonTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function coverageDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
