import type { Discount, LineItem } from "@/src/types/schemas";

// Per-line rounding to the nearest cent, then sum. Per spec §5 — matches
// Xero/MYOB and is ATO-accepted.
//
// Discount semantics (Phase 3):
//   1. Per-line discount applies first, reducing the line's taxable amount
//      before GST is computed for that line.
//   2. Whole-invoice discount applies to the post-line-discount taxable
//      subtotal, allocated proportionally across taxable lines so GST stays
//      correct on each line.
//   3. Validation: lineDiscountTotal + invoiceDiscountTotal ≤ subtotal.

export type LineInput = {
  description: string;
  qty: number;
  unitPriceCents: number;
  gstRate: number;
  unit?: string;
  lineDiscount?: Discount;
};

const PCT_DENOM = 10_000; // pct values are basis points; 1000 = 10%.

function applyDiscount(amountCents: number, discount: Discount | undefined): number {
  if (!discount || discount.value <= 0) return 0;
  if (discount.type === "fixed") {
    return Math.min(discount.value, amountCents);
  }
  // pct
  const reduction = Math.round((amountCents * discount.value) / PCT_DENOM);
  return Math.min(reduction, amountCents);
}

export function enrichLine(input: LineInput): LineItem {
  const grossSubtotal = Math.round(input.qty * input.unitPriceCents);
  const lineDiscountAmountCents = applyDiscount(grossSubtotal, input.lineDiscount);
  const taxableCents = grossSubtotal - lineDiscountAmountCents;
  const gstAmountCents = Math.round(taxableCents * input.gstRate);
  const lineTotalCents = taxableCents + gstAmountCents;

  return {
    description: input.description,
    qty: input.qty,
    ...(input.unit ? { unit: input.unit } : {}),
    unitPriceCents: input.unitPriceCents,
    gstRate: input.gstRate,
    ...(input.lineDiscount ? { lineDiscount: input.lineDiscount } : {}),
    lineDiscountAmountCents,
    taxableCents,
    gstAmountCents,
    lineTotalCents,
  };
}

export type GstByRate = Record<string, { taxableCents: number; gstCents: number }>;

export type InvoiceTotals = {
  // Sum of pre-discount line subtotals (qty × unitPrice). Matches what the user
  // typed on each line before any discount.
  grossSubtotalCents: number;
  // Sum of per-line discounts.
  lineDiscountTotalCents: number;
  // Whole-invoice discount allocated across taxable lines.
  invoiceDiscountTotalCents: number;
  // Aggregate of both discounts (cheap rendering helper).
  discountTotalCents: number;
  // Pre-GST subtotal after both discount layers.
  subtotalCents: number;
  // Per-line GST aggregated.
  gstTotalCents: number;
  // Final invoice total.
  totalCents: number;
  // Breakdown by GST rate. Keys are stringified rates (e.g. "0.1", "0").
  gstByRate: GstByRate;
};

export function computeInvoiceTotals(
  lines: LineItem[],
  invoiceDiscount?: Discount,
): InvoiceTotals {
  // Per-line totals already factor in lineDiscount via enrichLine.
  let grossSubtotal = 0;
  let lineDiscountTotal = 0;

  for (const l of lines) {
    grossSubtotal += l.taxableCents + l.lineDiscountAmountCents;
    lineDiscountTotal += l.lineDiscountAmountCents;
  }
  const taxableSubtotal = grossSubtotal - lineDiscountTotal;

  const invoiceDiscountTotal = applyDiscount(taxableSubtotal, invoiceDiscount);

  // Allocate the whole-invoice discount proportionally across taxable lines.
  // Distribute by share of post-line-discount taxable amount. Use the
  // largest-remainder rule to make per-line allocations sum to exactly the
  // total discount (no rounding gap).
  const allocations = allocateDiscount(
    lines.map((l) => l.taxableCents),
    invoiceDiscountTotal,
  );

  let subtotal = 0;
  let gstTotal = 0;
  const gstByRate: GstByRate = {};

  lines.forEach((l, i) => {
    const allocated = allocations[i] ?? 0;
    const adjustedTaxable = l.taxableCents - allocated;
    const adjustedGst = Math.round(adjustedTaxable * l.gstRate);
    subtotal += adjustedTaxable;
    gstTotal += adjustedGst;

    const key = String(l.gstRate);
    const bucket = gstByRate[key] ?? { taxableCents: 0, gstCents: 0 };
    bucket.taxableCents += adjustedTaxable;
    bucket.gstCents += adjustedGst;
    gstByRate[key] = bucket;
  });

  return {
    grossSubtotalCents: grossSubtotal,
    lineDiscountTotalCents: lineDiscountTotal,
    invoiceDiscountTotalCents: invoiceDiscountTotal,
    discountTotalCents: lineDiscountTotal + invoiceDiscountTotal,
    subtotalCents: subtotal,
    gstTotalCents: gstTotal,
    totalCents: subtotal + gstTotal,
    gstByRate,
  };
}

// Allocate a total amount across weights using the largest-remainder method
// so the allocations sum to exactly `total`. Pure helper, exported for tests.
export function allocateDiscount(weights: number[], total: number): number[] {
  if (total <= 0) return weights.map(() => 0);
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (w * total) / sumWeights);
  const floored = raw.map((r) => Math.floor(r));
  const remainders = raw.map((r, i) => ({
    i,
    frac: r - (floored[i] ?? 0),
  }));
  const allocated = floored.slice();
  let assigned = floored.reduce((a, b) => a + b, 0);
  // Remaining cents go to the largest fractional remainders, breaking ties by
  // index (stable).
  remainders.sort((a, b) => b.frac - a.frac || a.i - b.i);
  let cursor = 0;
  while (assigned < total && cursor < remainders.length) {
    const target = remainders[cursor];
    if (!target) break;
    allocated[target.i] = (allocated[target.i] ?? 0) + 1;
    assigned += 1;
    cursor += 1;
  }
  return allocated;
}

// Convenience for the editor — takes raw inputs and returns enriched lines +
// totals in one call so the live total updates on every keystroke.
export function computeFromInputs(
  inputs: LineInput[],
  invoiceDiscount?: Discount,
) {
  const lines = inputs.map(enrichLine);
  const totals = computeInvoiceTotals(lines, invoiceDiscount);
  return { lines, totals };
}

export function isDiscountValid(
  lines: LineItem[],
  invoiceDiscount: Discount | undefined,
): boolean {
  // Re-derive against the current line inputs.
  const totals = computeInvoiceTotals(lines, invoiceDiscount);
  return totals.discountTotalCents <= totals.grossSubtotalCents;
}
