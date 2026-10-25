import { parseOptionalIsoDate } from "@/src/lib/payment-date";

// What the draft editor should write. A half-typed value is left unsaved so
// autosave does not wipe a due date the user is still editing. Blank clears it.
export function dueDateDraftPatch(
  value: string,
): { dueDate: string } | Record<string, never> {
  const parsed = parseOptionalIsoDate(value);
  if (!parsed.ok) return {};
  if (!parsed.date) return { dueDate: "" };
  return { dueDate: parsed.date };
}

// Blank, whitespace, and null are no due date. A non-date is omitted.
export function optionalDueDate(value: string | null | undefined): string | undefined {
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
