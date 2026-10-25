const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// An optional calendar date. Blank is accepted; anything else must be YYYY-MM-DD.
export function parseOptionalIsoDate(
  value: string | undefined,
): { ok: true; date?: string } | { ok: false } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: true };
  if (!ISO_DATE.test(trimmed)) return { ok: false };
  return { ok: true, date: trimmed };
}

export const parseOptionalPaymentDate = parseOptionalIsoDate;
