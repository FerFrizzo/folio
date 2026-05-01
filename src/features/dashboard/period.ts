import {
  startOfMonth,
  startOfQuarter,
  endOfMonth,
  endOfQuarter,
  format,
  isWithinInterval,
} from "date-fns";

export type PeriodKey = "month" | "quarter" | "fy";

// Australian financial year runs 1 July → 30 June.
function australianFy(today: Date): { start: Date; end: Date } {
  const year = today.getFullYear();
  const fyStartYear = today.getMonth() >= 6 ? year : year - 1;
  return {
    start: new Date(fyStartYear, 6, 1),
    end: new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999),
  };
}

export function periodRange(key: PeriodKey, today: Date = new Date()): { start: Date; end: Date } {
  if (key === "month") {
    return { start: startOfMonth(today), end: endOfMonth(today) };
  }
  if (key === "quarter") {
    return { start: startOfQuarter(today), end: endOfQuarter(today) };
  }
  return australianFy(today);
}

export function periodLabel(key: PeriodKey, today: Date = new Date()): string {
  if (key === "month") return format(today, "MMMM yyyy");
  if (key === "quarter") {
    const r = periodRange("quarter", today);
    return `${format(r.start, "MMM")}–${format(r.end, "MMM yyyy")}`;
  }
  const r = periodRange("fy", today);
  return `FY ${format(r.start, "yy")}–${format(r.end, "yy")}`;
}

export function isInPeriod(iso: string, range: { start: Date; end: Date }): boolean {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return isWithinInterval(d, { start: range.start, end: range.end });
}
