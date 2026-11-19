import { DATE_ENTRY_ERROR, dateEntryError } from "@/src/lib/iso-date";
import { parseOptionalIsoDate } from "@/src/lib/payment-date";

export type AcceptedDueDate =
  | { ok: true; date?: string }
  | { ok: false; message: string };

// Blank clears the due date. A real calendar day is kept. Any other text is an
// error the editor shows, and the previous stored value stays until they pick or clear.
export function acceptDueDate(value: string): AcceptedDueDate {
  const message = dateEntryError(value);
  if (message) return { ok: false, message };
  const parsed = parseOptionalIsoDate(value);
  if (!parsed.ok) {
    return { ok: false, message: DATE_ENTRY_ERROR };
  }
  return parsed.date ? { ok: true, date: parsed.date } : { ok: true };
}

// What the draft editor should write. An invalid value is left unsaved so a
// bad string cannot wipe a stored due date; the field shows acceptDueDate's
// message until the user picks a day or clears it. Blank clears it.
export function dueDateDraftPatch(
  value: string,
): { dueDate: string } | Record<string, never> {
  const accepted = acceptDueDate(value);
  if (!accepted.ok || !accepted.date) {
    return accepted.ok ? { dueDate: "" } : {};
  }
  return { dueDate: accepted.date };
}

// Blank, whitespace, and null are no due date. A non-date is omitted.
export function optionalDueDate(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const parsed = parseOptionalIsoDate(value);
  return parsed.ok ? parsed.date : undefined;
}

// Same as optionalDueDate, but a non-date is an error so it is not stored.
export function requireOptionalDueDate(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const parsed = parseOptionalIsoDate(value);
  if (!parsed.ok) throw new Error("Use a date as YYYY-MM-DD.");
  return parsed.date;
}
