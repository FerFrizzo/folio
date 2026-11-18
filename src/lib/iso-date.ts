const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DATE_ENTRY_ERROR = "Choose a calendar date, such as 18 Dec 2026.";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// A real calendar day, not just the YYYY-MM-DD shape. 2026-02-31 matches the
// shape and then rolls into March, which is how a bad due date used to vanish.
export function isRealIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// Blank is fine (the due date is optional). Anything else must be a real day.
export function dateEntryError(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || isRealIsoDate(trimmed)) return null;
  return DATE_ENTRY_ERROR;
}

export function formatIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!isRealIsoDate(trimmed)) return null;
  const match = ISO_DATE.exec(trimmed);
  if (!match) return null;
  const monthName = MONTHS[Number(match[2]) - 1];
  if (!monthName) return null;
  return `${Number(match[3])} ${monthName} ${match[1]}`;
}

export function dateFromIso(value: string): Date | null {
  const trimmed = value.trim();
  if (!isRealIsoDate(trimmed)) return null;
  const match = ISO_DATE.exec(trimmed);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Local calendar fields. The native picker returns a Date for the day the
// user chose; slicing toISOString() would shift that day in timezones behind UTC.
export function isoFromDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  return isRealIsoDate(iso) ? iso : null;
}
