/**
 * Calendar-date helpers.
 *
 * Due dates and the wedding date are plain calendar dates ("2027-09-18"), not
 * instants. Keeping them as ISO date strings and doing the arithmetic in UTC
 * means a deadline can never drift by a day when someone opens the app in a
 * different time zone.
 */

export type IsoDate = string; // YYYY-MM-DD

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: IsoDate): number {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's calendar date in the given IANA time zone. */
export function todayInZone(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hour of day (0-23) in the given time zone, for greetings. */
export function hourInZone(timeZone: string, now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number.parseInt(h, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

export function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: IsoDate): IsoDate {
  const d = new Date(toUtc(monthStart(date)));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return fromUtc(d.getTime());
}

/** Shift a date's month by n, returning the first day of the resulting month. */
export function addMonthsToMonthStart(date: IsoDate, months: number): IsoDate {
  const d = new Date(toUtc(monthStart(date)));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUtc(d.getTime());
}

/** Number of whole months from one month to another (by calendar month). */
export function monthsBetween(fromMonth: IsoDate, toMonth: IsoDate): number {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function compareDates(a: IsoDate | null, b: IsoDate | null): number {
  if (a === b) return 0;
  if (a === null) return 1; // undated sorts last
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

const longFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const shortFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const shortYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

export function formatLongDate(date: IsoDate): string {
  return longFormatter.format(new Date(toUtc(date)));
}

/** "Mar 4", or "Mar 4, 2028" when the year differs from `today`. */
export function formatShortDate(date: IsoDate, today?: IsoDate): string {
  const d = new Date(toUtc(date));
  if (today && today.slice(0, 4) !== date.slice(0, 4)) return shortYearFormatter.format(d);
  return shortFormatter.format(d);
}

export function formatMonth(date: IsoDate): string {
  return monthFormatter.format(new Date(toUtc(monthStart(date))));
}
