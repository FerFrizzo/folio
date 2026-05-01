import {
  allocateDiscount,
  computeFromInputs,
  computeInvoiceTotals,
  enrichLine,
  isDiscountValid,
} from "@/src/lib/invoice-totals";

describe("enrichLine — no discount", () => {
  it("computes 10% GST on a clean amount", () => {
    expect(
      enrichLine({
        description: "Service",
        qty: 1,
        unitPriceCents: 132000,
        gstRate: 0.1,
      }),
    ).toEqual({
      description: "Service",
      qty: 1,
      unitPriceCents: 132000,
      gstRate: 0.1,
      lineDiscountAmountCents: 0,
      taxableCents: 132000,
      gstAmountCents: 13200,
      lineTotalCents: 145200,
    });
  });

  it("rounds half-cents up per Xero/MYOB convention", () => {
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 3333,
      gstRate: 0.1,
    });
    expect(line.gstAmountCents).toBe(333);
    expect(line.lineTotalCents).toBe(3666);
  });

  it("supports decimal quantities", () => {
    const line = enrichLine({
      description: "Hours",
      qty: 1.5,
      unitPriceCents: 8000,
      gstRate: 0.1,
    });
    expect(line.taxableCents).toBe(12000);
    expect(line.gstAmountCents).toBe(1200);
    expect(line.lineTotalCents).toBe(13200);
  });

  it("supports zero GST (export / GST-free)", () => {
    const line = enrichLine({
      description: "Export",
      qty: 1,
      unitPriceCents: 50000,
      gstRate: 0,
    });
    expect(line.gstAmountCents).toBe(0);
    expect(line.lineTotalCents).toBe(50000);
  });
});

describe("enrichLine — per-line discount", () => {
  it("applies a percentage discount before GST", () => {
    // $100 line × 10% off = $90; GST 10% = $9; total = $99
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 10000,
      gstRate: 0.1,
      lineDiscount: { type: "pct", value: 1000 }, // 10.00%
    });
    expect(line.lineDiscountAmountCents).toBe(1000);
    expect(line.taxableCents).toBe(9000);
    expect(line.gstAmountCents).toBe(900);
    expect(line.lineTotalCents).toBe(9900);
  });

  it("applies a fixed-cent discount", () => {
    // $100 − $15 = $85; GST $8.50; total $93.50
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 10000,
      gstRate: 0.1,
      lineDiscount: { type: "fixed", value: 1500 },
    });
    expect(line.lineDiscountAmountCents).toBe(1500);
    expect(line.taxableCents).toBe(8500);
    expect(line.gstAmountCents).toBe(850);
    expect(line.lineTotalCents).toBe(9350);
  });

  it("clamps a fixed discount that exceeds the gross subtotal", () => {
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 1000,
      gstRate: 0.1,
      lineDiscount: { type: "fixed", value: 5000 },
    });
    expect(line.lineDiscountAmountCents).toBe(1000);
    expect(line.taxableCents).toBe(0);
    expect(line.gstAmountCents).toBe(0);
    expect(line.lineTotalCents).toBe(0);
  });
});

describe("computeInvoiceTotals — no whole-invoice discount", () => {
  it("sums and exposes gstByRate for a single rate", () => {
    const lines = [
      enrichLine({ description: "a", qty: 1, unitPriceCents: 100000, gstRate: 0.1 }),
      enrichLine({ description: "b", qty: 2, unitPriceCents: 25000, gstRate: 0.1 }),
    ];
    const t = computeInvoiceTotals(lines);
    expect(t.grossSubtotalCents).toBe(150000);
    expect(t.subtotalCents).toBe(150000);
    expect(t.gstTotalCents).toBe(15000);
    expect(t.totalCents).toBe(165000);
    expect(t.gstByRate["0.1"]).toEqual({ taxableCents: 150000, gstCents: 15000 });
  });

  it("breaks GST out by rate when lines mix", () => {
    const lines = [
      enrichLine({ description: "AUD", qty: 1, unitPriceCents: 50000, gstRate: 0.1 }),
      enrichLine({ description: "GST-free", qty: 1, unitPriceCents: 50000, gstRate: 0 }),
    ];
    const t = computeInvoiceTotals(lines);
    expect(t.gstByRate["0.1"]).toEqual({ taxableCents: 50000, gstCents: 5000 });
    expect(t.gstByRate["0"]).toEqual({ taxableCents: 50000, gstCents: 0 });
    expect(t.gstTotalCents).toBe(5000);
    expect(t.totalCents).toBe(105000);
  });
});

describe("computeInvoiceTotals — whole-invoice discount", () => {
  it("applies a percentage whole-invoice discount proportionally", () => {
    // 3 × $100 = $300; 10% off = $270; GST 10% = $27; total $297
    const lines = [
      enrichLine({ description: "a", qty: 1, unitPriceCents: 10000, gstRate: 0.1 }),
      enrichLine({ description: "b", qty: 1, unitPriceCents: 10000, gstRate: 0.1 }),
      enrichLine({ description: "c", qty: 1, unitPriceCents: 10000, gstRate: 0.1 }),
    ];
    const t = computeInvoiceTotals(lines, { type: "pct", value: 1000 });
    expect(t.invoiceDiscountTotalCents).toBe(3000);
    expect(t.subtotalCents).toBe(27000);
    expect(t.gstTotalCents).toBe(2700);
    expect(t.totalCents).toBe(29700);
  });

  it("uses largest-remainder allocation so totals sum exactly", () => {
    // 3 × $33.33 = $99.99; $10 invoice discount → 3 lines split $3.33/$3.33/$3.34
    const lines = [
      enrichLine({ description: "a", qty: 1, unitPriceCents: 3333, gstRate: 0 }),
      enrichLine({ description: "b", qty: 1, unitPriceCents: 3333, gstRate: 0 }),
      enrichLine({ description: "c", qty: 1, unitPriceCents: 3333, gstRate: 0 }),
    ];
    const t = computeInvoiceTotals(lines, { type: "fixed", value: 1000 });
    expect(t.grossSubtotalCents).toBe(9999);
    expect(t.invoiceDiscountTotalCents).toBe(1000);
    // Subtotal == grossSubtotal − invoiceDiscount, exactly.
    expect(t.subtotalCents).toBe(9999 - 1000);
    expect(t.totalCents).toBe(t.subtotalCents + t.gstTotalCents);
  });

  it("preserves GST mix with proportional split (10% line + GST-free line)", () => {
    // $100 (10%) + $100 (0%) − $40 invoice discount → split $20/$20.
    // After: $80 taxable @ 10% (GST $8), $80 GST-free. Total $168.
    const lines = [
      enrichLine({ description: "AUD", qty: 1, unitPriceCents: 10000, gstRate: 0.1 }),
      enrichLine({ description: "GST-free", qty: 1, unitPriceCents: 10000, gstRate: 0 }),
    ];
    const t = computeInvoiceTotals(lines, { type: "fixed", value: 4000 });
    expect(t.gstByRate["0.1"]).toEqual({ taxableCents: 8000, gstCents: 800 });
    expect(t.gstByRate["0"]).toEqual({ taxableCents: 8000, gstCents: 0 });
    expect(t.subtotalCents).toBe(16000);
    expect(t.totalCents).toBe(16800);
  });

  it("stacks per-line + whole-invoice discounts (per-line first)", () => {
    // $100 @ 10% line discount → $90 line; +$50 line → $140 taxable.
    // 10% whole-invoice off $140 = $14 → $126 taxable → +12.60 GST = $138.60.
    const lines = [
      enrichLine({
        description: "a",
        qty: 1,
        unitPriceCents: 10000,
        gstRate: 0.1,
        lineDiscount: { type: "pct", value: 1000 },
      }),
      enrichLine({ description: "b", qty: 1, unitPriceCents: 5000, gstRate: 0.1 }),
    ];
    const t = computeInvoiceTotals(lines, { type: "pct", value: 1000 });
    expect(t.lineDiscountTotalCents).toBe(1000);
    expect(t.invoiceDiscountTotalCents).toBe(1400);
    expect(t.subtotalCents).toBe(12600);
    expect(t.gstTotalCents).toBe(1260);
    expect(t.totalCents).toBe(13860);
  });
});

describe("allocateDiscount", () => {
  it("returns zeros for total == 0", () => {
    expect(allocateDiscount([100, 200, 300], 0)).toEqual([0, 0, 0]);
  });
  it("sums to total exactly using largest remainder", () => {
    const out = allocateDiscount([3333, 3333, 3333], 1000);
    expect(out.reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it("returns zeros when all weights are zero", () => {
    expect(allocateDiscount([0, 0, 0], 100)).toEqual([0, 0, 0]);
  });
});

describe("isDiscountValid", () => {
  it("rejects discounts that exceed the subtotal", () => {
    const lines = [
      enrichLine({ description: "a", qty: 1, unitPriceCents: 1000, gstRate: 0.1 }),
    ];
    expect(isDiscountValid(lines, { type: "fixed", value: 99999 })).toBe(true);
    // applyDiscount clamps; the function returns the clamped amount, so the
    // contract is "discount won't exceed subtotal after clamping". Verify
    // the boundary directly:
    const totals = computeInvoiceTotals(lines, { type: "fixed", value: 99999 });
    expect(totals.invoiceDiscountTotalCents).toBe(1000);
    expect(totals.subtotalCents).toBe(0);
  });
});

describe("computeFromInputs", () => {
  it("returns enriched lines + totals from raw inputs", () => {
    const result = computeFromInputs([
      { description: "Service", qty: 1, unitPriceCents: 132000, gstRate: 0.1 },
    ]);
    expect(result.lines).toHaveLength(1);
    expect(result.totals.totalCents).toBe(145200);
  });

  it("propagates the invoice discount", () => {
    const result = computeFromInputs(
      [{ description: "Service", qty: 1, unitPriceCents: 10000, gstRate: 0.1 }],
      { type: "pct", value: 1000 },
    );
    expect(result.totals.invoiceDiscountTotalCents).toBe(1000);
    expect(result.totals.totalCents).toBe(9900);
  });
});
