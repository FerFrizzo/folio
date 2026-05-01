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
