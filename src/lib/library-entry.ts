// Turns the library form's raw text fields into the numbers the schema wants,
// or explains why it can't. Both places that save a library entry — the Settings
// card and the invoice editor's per-line bookmark — went through the same
// `Number(x) || fallback` arithmetic inline, which lets a negative through
// because it's truthy. That reached LineItemLibraryEntrySchema's nonnegative()
// check and surfaced as a raw ZodError.
//
// Returns a result rather than a blocker string (the shape used in
// invoice-validation) because callers need the parsed values too, and computing
// them twice is what let the two copies drift.

export type LibraryEntryFields = {
  description: string;
  defaultQty: number;
  unitPriceCents: number;
};

export type LibraryEntryResult =
  | { ok: true; entry: LibraryEntryFields }
  | { ok: false; message: string };

export function readLibraryEntryInput(input: {
  description: string;
  qty: string;
  unitPriceText: string;
}): LibraryEntryResult {
  const description = input.description.trim();
  if (!description) return { ok: false, message: "Add a description first." };

  // NaN and 0 are falsy, so they take the fallback; only a real negative
  // survives to be rejected here.
  const qty = Number(input.qty);
  if (qty < 0) return { ok: false, message: "Quantity can't be negative." };

  const price = Number(input.unitPriceText);
  if (price < 0) return { ok: false, message: "Price can't be negative." };

  return {
    ok: true,
    entry: {
      description,
      defaultQty: qty || 1,
      unitPriceCents: Math.round(price * 100) || 0,
    },
  };
}
