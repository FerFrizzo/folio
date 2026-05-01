import {
  computeFromInputs,
  computeInvoiceTotals,
  enrichLine,
} from "@/src/lib/invoice-totals";

describe("enrichLine", () => {
  it("computes 10% GST on a clean amount", () => {
    expect(
      enrichLine({
        description: "Service",
        qty: 1,
        unitPriceCents: 132000, // $1,320.00
        gstRate: 0.1,
      }),
    ).toEqual({
      description: "Service",
      qty: 1,
      unitPriceCents: 132000,
      gstRate: 0.1,
      gstAmountCents: 13200,
      lineTotalCents: 145200,
    });
  });

  it("rounds half-cents up per Xero/MYOB convention", () => {
    // $33.33 × 1, GST 10% = $3.333 → rounds to $3.33
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 3333,
      gstRate: 0.1,
    });
    expect(line.gstAmountCents).toBe(333);
    expect(line.lineTotalCents).toBe(3666);
  });

  it("rounds GST that lands on .5 (half-up for positives)", () => {
    // $0.05 × 1, GST 10% = $0.005 → 1 cent
    const line = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 5,
      gstRate: 0.1,
    });
    expect(line.gstAmountCents).toBe(1);
  });

  it("supports decimal quantities (e.g. 1.5 hours)", () => {
    // 1.5 × $80.00 = $120.00, GST 10% = $12.00
    const line = enrichLine({
      description: "Hours",
      qty: 1.5,
      unitPriceCents: 8000,
      gstRate: 0.1,
    });
    expect(line.lineTotalCents - line.gstAmountCents).toBe(12000);
    expect(line.gstAmountCents).toBe(1200);
    expect(line.lineTotalCents).toBe(13200);
  });

  it("supports zero GST (GST-free items)", () => {
    const line = enrichLine({
      description: "Export",
      qty: 1,
      unitPriceCents: 50000,
      gstRate: 0,
    });
    expect(line.gstAmountCents).toBe(0);
    expect(line.lineTotalCents).toBe(50000);
  });

  it("only sets the unit field when provided (avoids undefined)", () => {
    const withoutUnit = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 100,
      gstRate: 0.1,
    });
    expect("unit" in withoutUnit).toBe(false);

    const withUnit = enrichLine({
      description: "x",
      qty: 1,
      unitPriceCents: 100,
      gstRate: 0.1,
      unit: "hr",
    });
    expect(withUnit.unit).toBe("hr");
  });
});

describe("computeInvoiceTotals", () => {
  it("sums per-line subtotals and GST", () => {
    const lines = [
      enrichLine({ description: "a", qty: 1, unitPriceCents: 100000, gstRate: 0.1 }),
      enrichLine({ description: "b", qty: 2, unitPriceCents: 25000, gstRate: 0.1 }),
    ];
    expect(computeInvoiceTotals(lines)).toEqual({
      subtotalCents: 150000,    // $1000 + 2 × $250 = $1500
      gstTotalCents: 15000,     // $100 + $50 = $150
      totalCents: 165000,        // $1650
    });
  });

  it("returns zeros for an empty invoice", () => {
    expect(computeInvoiceTotals([])).toEqual({
      subtotalCents: 0,
      gstTotalCents: 0,
      totalCents: 0,
    });
  });

  it("mixes GST-free and 10% lines correctly", () => {
    const lines = [
      enrichLine({ description: "AUD service", qty: 1, unitPriceCents: 50000, gstRate: 0.1 }),
      enrichLine({ description: "GST-free", qty: 1, unitPriceCents: 50000, gstRate: 0 }),
    ];
    expect(computeInvoiceTotals(lines)).toEqual({
      subtotalCents: 100000,
      gstTotalCents: 5000,
      totalCents: 105000,
    });
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
});
