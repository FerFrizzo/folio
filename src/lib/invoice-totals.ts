import type { LineItem } from "@/src/types/schemas";

// Per-line rounding to the nearest cent, then sum. Per spec §5 — matches
// Xero/MYOB and is ATO-accepted.
//
// Phase 2 is single-rate, single-currency, no discounts. The signatures already
// accept per-line gstRate and the totals function returns mixed-rate-friendly
// fields so Phase 3 (multi-rate, discounts) can extend without churning the
// caller surface.

export type LineInput = {
  description: string;
  qty: number;
  unitPriceCents: number;
  gstRate: number;
  unit?: string;
};

export function enrichLine(input: LineInput): LineItem {
  // Math.round implements banker's rounding inconsistently across JS engines
  // (it doesn't — JS Math.round is half-away-from-zero for positives), but for
  // monetary values that round to a half-cent we accept Math.round's
  // half-up-for-positive behaviour. Negative values are not expected on
  // invoice line items in Phase 2 (credit notes are a separate document).
  const rawSubtotal = input.qty * input.unitPriceCents;
  const subtotalCents = Math.round(rawSubtotal);
  const gstAmountCents = Math.round(subtotalCents * input.gstRate);
  const lineTotalCents = subtotalCents + gstAmountCents;

  return {
    description: input.description,
    qty: input.qty,
    ...(input.unit ? { unit: input.unit } : {}),
    unitPriceCents: input.unitPriceCents,
    gstRate: input.gstRate,
    gstAmountCents,
    lineTotalCents,
  };
}

export type InvoiceTotals = {
  subtotalCents: number; // sum of pre-GST line subtotals
  gstTotalCents: number; // sum of per-line GST
  totalCents: number;    // subtotal + gstTotal
};

export function computeInvoiceTotals(lines: LineItem[]): InvoiceTotals {
  let subtotal = 0;
  let gst = 0;
  for (const line of lines) {
    // Re-derive subtotalCents from qty × unitPrice for safety; the LineItem
    // shape doesn't carry an explicit subtotal field. lineTotalCents already
    // includes GST, so we subtract gstAmountCents to recover the subtotal.
    subtotal += line.lineTotalCents - line.gstAmountCents;
    gst += line.gstAmountCents;
  }
  return {
    subtotalCents: subtotal,
    gstTotalCents: gst,
    totalCents: subtotal + gst,
  };
}

// Convenience for the editor — takes raw inputs and returns enriched lines +
// totals in one call so the live total updates on every keystroke.
export function computeFromInputs(inputs: LineInput[]) {
  const lines = inputs.map(enrichLine);
  const totals = computeInvoiceTotals(lines);
  return { lines, totals };
}
