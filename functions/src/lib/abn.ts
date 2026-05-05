const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export function normalizeAbn(value: string): string {
  return value.replace(/\s+/g, "");
}

export function isValidAbn(value: string): boolean {
  const stripped = normalizeAbn(value);
  if (!/^\d{11}$/.test(stripped)) return false;
  const digits = stripped.split("").map(Number);
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

export function formatAbn(value: string): string {
  const stripped = normalizeAbn(value);
  if (stripped.length !== 11) return value;
  return `${stripped.slice(0, 2)} ${stripped.slice(2, 5)} ${stripped.slice(5, 8)} ${stripped.slice(8, 11)}`;
}
