// Invoice numbering for auto mode. Phase 2 only supports auto; custom format
// strings land in Phase 3 (spec §4 settings.numbering.customFormat).

export type AutoNumberInput = {
  prefix: string; // e.g. "INV-"
  counter: number; // next sequence number; pass the post-increment value
  minDigits?: number; // default 4 → "INV-0001"
};

export function formatAutoNumber({
  prefix,
  counter,
  minDigits = 4,
}: AutoNumberInput): string {
  if (counter < 1) {
    throw new Error("Counter must be ≥ 1");
  }
  const padded = String(counter).padStart(minDigits, "0");
  return `${prefix}${padded}`;
}

// Inverse of formatAutoNumber: if `value` is `${prefix}${digits}` return the
// integer sequence, else null (e.g. a manual number that doesn't match the
// prefix/format — we then leave the auto counter untouched).
export function parseAutoNumber(value: string, prefix: string): number | null {
  if (!value.startsWith(prefix)) return null;
  const rest = value.slice(prefix.length);
  if (rest.length === 0 || !/^\d+$/.test(rest)) return null;
  const n = Number(rest);
  return Number.isSafeInteger(n) ? n : null;
}

// ---------- suggestion shown in the editor header ----------

// What markSent would issue right now. Mirrors the arithmetic in
// claimNextInvoiceNumberInTransaction (counters.ts): the stored counter is the
// last number used, so the next one is counter + 1. Advisory only — the real
// number is still claimed inside markSent's transaction, which is what keeps
// allocation atomic.
export function suggestNextInvoiceNumber(input: {
  prefix: string;
  counter: number;
  minDigits?: number;
}): string {
  return formatAutoNumber({
    prefix: input.prefix,
    counter: input.counter + 1,
    ...(input.minDigits === undefined ? {} : { minDigits: input.minDigits }),
  });
}

// What the header should show. "DRAFT" is the sentinel a draft carries until
// it's sent, so it's the least informative option and comes last.
export function displayInvoiceNumber(input: {
  stored: string;
  edited: boolean;
  typed: string;
  suggestion: string | null;
}): string {
  if (input.edited) return input.typed;
  if (input.stored !== "DRAFT") return input.stored;
  return input.suggestion ?? "DRAFT";
}

// Whether the typed number should be written onto the draft. Anything persisted
// here sends markSent down its manual branch, skipping the atomic claim — so
// only a number the user genuinely chose qualifies. Typing the suggestion back
// in is acceptance, not an override, and stays on the atomic path.
export function shouldPersistNumber(input: {
  allowManualNumber: boolean;
  edited: boolean;
  typed: string;
  suggestion: string | null;
}): boolean {
  if (!input.allowManualNumber || !input.edited) return false;
  const trimmed = input.typed.trim();
  if (trimmed === "") return false;
  return trimmed !== input.suggestion;
}
