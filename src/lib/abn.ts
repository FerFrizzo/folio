// ABN (Australian Business Number) checksum validator. Spec §13 voice/copy:
// "ABN must be 11 digits" — the field accepts only digits, then this helper
// validates the weighted-mod-89 checksum the ATO publishes.

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function normalizeAbn(value: string): string {
  return value.replace(/\s+/g, "");
}

export function isValidAbn(value: string): boolean {
  const stripped = normalizeAbn(value);
  if (!/^\d{11}$/.test(stripped)) return false;

  // Subtract 1 from the leftmost digit, then weighted sum, then mod 89.
  const digits = stripped.split("").map(Number);
  // Type narrowing: we just verified all 11 indices exist, but TS can't see
  // through the regex check. Defensive read to satisfy noUncheckedIndexedAccess.
  const first = digits[0];
  if (first === undefined) return false;
  digits[0] = first - 1;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = digits[i];
    const w = WEIGHTS[i];
    if (d === undefined || w === undefined) return false;
    sum += d * w;
  }
  return sum % 89 === 0;
}

// Format for display: "12 345 678 901" — three groups of 3-2-3-3 digits.
export function formatAbn(value: string): string {
  const stripped = normalizeAbn(value);
  if (stripped.length !== 11) return value;
  return `${stripped.slice(0, 2)} ${stripped.slice(2, 5)} ${stripped.slice(5, 8)} ${stripped.slice(8, 11)}`;
}
