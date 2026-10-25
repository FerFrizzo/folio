import { InvoiceSchema, PaymentRecordSchema, SettingsSchema } from "@/src/types/schemas";

describe("SettingsSchema.defaultGstRate", () => {
  // A brand-new user must not have 10% GST silently pre-applied to their
  // first invoice line. GST-registered users opt in via Settings.
  it("defaults a fresh settings document to GST-free", () => {
    expect(SettingsSchema.parse({}).defaultGstRate).toBe(0);
  });

  it("keeps 10% when the user has explicitly saved it", () => {
    expect(SettingsSchema.parse({ defaultGstRate: 0.1 }).defaultGstRate).toBe(0.1);
  });

  it("still rejects a rate above 100%", () => {
    expect(() => SettingsSchema.parse({ defaultGstRate: 1.5 })).toThrow();
  });
});

describe("PaymentRecordSchema date", () => {
  it("accepts a payment with no date and leaves the field off", () => {
    const parsed = PaymentRecordSchema.parse({ amountCents: 100 });
    expect(parsed.date).toBeUndefined();
    expect("date" in parsed).toBe(false);
  });

  it("treats blank and null dates as absent", () => {
    for (const date of ["", "  ", null]) {
      const parsed = PaymentRecordSchema.parse({ amountCents: 100, date });
      expect(parsed.date).toBeUndefined();
      expect("date" in parsed).toBe(false);
    }
  });

  it("keeps a real payment date", () => {
    expect(PaymentRecordSchema.parse({ amountCents: 100, date: " 2026-05-25 " }).date).toBe(
      "2026-05-25",
    );
  });

  it("rejects a non-ISO payment date", () => {
    expect(() => PaymentRecordSchema.parse({ amountCents: 100, date: "25/05/2026" })).toThrow();
  });

  it("lets an invoice parse when a payment was stored without a date", () => {
    const parsed = InvoiceSchema.parse({
      id: "inv-1",
      number: "INV-0001",
      status: "partial",
      currency: "AUD",
      clientId: null,
      clientSnapshot: { name: "Acme" },
      issueDate: "2026-05-01",
      lineItems: [],
      subtotalCents: 100,
      gstTotalCents: 0,
      totalCents: 100,
      balanceCents: 50,
      payments: [{ amountCents: 50, date: "" }, { amountCents: 25 }],
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(parsed.payments[0]?.date).toBeUndefined();
    expect(parsed.payments[1]?.date).toBeUndefined();
  });
});

const invoiceBase = {
  id: "inv-1",
  number: "INV-0001",
  status: "draft" as const,
  currency: "AUD" as const,
  clientId: null,
  clientSnapshot: { name: "Acme" },
  issueDate: "2026-05-01",
  lineItems: [],
  subtotalCents: 100,
  gstTotalCents: 0,
  totalCents: 100,
  balanceCents: 100,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("InvoiceSchema due date", () => {
  it("treats blank, whitespace, and null due dates as absent", () => {
    for (const dueDate of ["", "   ", null]) {
      const parsed = InvoiceSchema.parse({ ...invoiceBase, dueDate });
      expect(parsed.dueDate).toBeUndefined();
    }
  });

  it("keeps a trimmed due date", () => {
    expect(InvoiceSchema.parse({ ...invoiceBase, dueDate: " 2026-06-02 " }).dueDate).toBe(
      "2026-06-02",
    );
  });

  it("rejects a due date that is not a calendar date", () => {
    expect(() => InvoiceSchema.parse({ ...invoiceBase, dueDate: "next week" })).toThrow();
  });
});
