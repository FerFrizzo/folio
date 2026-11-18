import { isRealIsoDate } from "@/src/lib/iso-date";

// An optional calendar date. Blank is accepted; anything else must be a real YYYY-MM-DD day.
export function parseOptionalIsoDate(
  value: string | undefined,
): { ok: true; date?: string } | { ok: false } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: true };
  if (!isRealIsoDate(trimmed)) return { ok: false };
  return { ok: true, date: trimmed };
}

export const parseOptionalPaymentDate = parseOptionalIsoDate;
