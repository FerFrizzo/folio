import { netBalanceCents, outstandingCents, paidSummary } from "@/src/lib/invoice-balance";
import type { CreditNote, Invoice } from "@/src/types/schemas";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    number: "INV-0001",
    status: "sent",
    currency: "AUD",
    clientId: null,
    clientSnapshot: { name: "Acme" },
    issueDate: "2026-05-01",
    lineItems: [],
    subtotalCents: 10000,
    lineDiscountTotalCents: 0,
    invoiceDiscountTotalCents: 0,
    discountTotalCents: 0,
    gstTotalCents: 1000,
    totalCents: 11000,
    amountPaidCents: 0,
    balanceCents: 11000,
    payments: [],
    notes: "",
    paymentInstructionsSnapshot: {},
    creditNoteIds: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function credit(overrides: Partial<CreditNote> = {}): CreditNote {
  return {
    id: "cn-1",
    number: "CN-0001",
    originalInvoiceId: "inv-1",
    originalInvoiceNumber: "INV-0001",
    currency: "AUD",
    clientSnapshot: { name: "Acme" },
    issueDate: "2026-05-02",
    reason: "",
    lineItems: [],
    subtotalCents: -10000,
    gstTotalCents: -1000,
    totalCents: -11000,
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("netBalanceCents", () => {
  it("is zero when one credit note cancels an unpaid invoice", () => {
    expect(netBalanceCents(invoice(), [credit()])).toBe(0);
  });

  it("subtracts payments as well as credit notes", () => {
    expect(
      netBalanceCents(invoice({ amountPaidCents: 5000 }), [credit({ totalCents: -6000 })]),
    ).toBe(0);
  });

  it("counts a duplicate credit note, so two full credits go negative", () => {
    expect(netBalanceCents(invoice(), [credit(), credit({ id: "cn-2" })])).toBe(-11000);
  });

  it("ignores archived credit notes", () => {
    expect(
      netBalanceCents(invoice(), [
        credit(),
        credit({ id: "cn-2", deletedAt: "2026-05-03T00:00:00.000Z" }),
      ]),
    ).toBe(0);
  });

  it("is zero for an archived invoice", () => {
    expect(
      netBalanceCents(invoice({ deletedAt: "2026-05-03T00:00:00.000Z" }), [credit()]),
    ).toBe(0);
  });
});

describe("outstandingCents", () => {
  it("excludes archived invoices and archived credit notes from the dashboard total", () => {
    const invoices = [
      invoice(),
      invoice({
        id: "inv-2",
        status: "sent",
        totalCents: 5000,
        deletedAt: "2026-05-04T00:00:00.000Z",
      }),
      invoice({ id: "inv-3", status: "paid", amountPaidCents: 11000, balanceCents: 0 }),
    ];
    const notes = [
      credit(),
      credit({
        id: "cn-archived",
        originalInvoiceId: "inv-1",
        deletedAt: "2026-05-04T00:00:00.000Z",
      }),
    ];
    expect(outstandingCents(invoices, notes)).toBe(0);
  });

  it("leaves a partly credited sent invoice outstanding", () => {
    expect(
      outstandingCents(
        [invoice()],
        [credit({ totalCents: -4000 })],
      ),
    ).toBe(7000);
  });
});

describe("paidSummary", () => {
  it("is hidden until something has been paid", () => {
    expect(paidSummary({ amountPaidCents: 0, balanceCents: 55000 })).toBeNull();
  });

  it("shows paid and the invoice's own outstanding balance", () => {
    expect(paidSummary({ amountPaidCents: 20000, balanceCents: 35000 })).toEqual({
      paidCents: 20000,
      outstandingCents: 35000,
    });
  });

  it("shows zero outstanding on a fully paid invoice", () => {
    expect(paidSummary({ amountPaidCents: 55000, balanceCents: 0 })).toEqual({
      paidCents: 55000,
      outstandingCents: 0,
    });
  });

  // Regression: the line showed the net balance, so a paid invoice with a
  // matching credit note read "Outstanding $-550.00".
  it("never reports a negative outstanding amount", () => {
    expect(paidSummary({ amountPaidCents: 55000, balanceCents: -100 })?.outstandingCents).toBe(0);
  });
});
