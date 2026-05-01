import {
  buildInvoicesCsv,
  buildLineItemsCsv,
} from "@/src/lib/exports/invoicesCsv";
import type { CreditNote, Invoice } from "@/src/types/schemas";

const baseInvoice: Invoice = {
  id: "inv_1",
  number: "INV-0001",
  status: "sent",
  currency: "AUD",
  clientId: "c1",
  clientSnapshot: { name: "Acme, Pty Ltd", abn: "53004085616" },
  issueDate: "2026-05-01",
  dueDate: "2026-05-15",
  lineItems: [
    {
      description: 'Service "A"',
      qty: 1,
      unitPriceCents: 12000,
      gstRate: 0.1,
      lineDiscountAmountCents: 0,
      taxableCents: 12000,
      gstAmountCents: 1200,
      lineTotalCents: 13200,
    },
  ],
  subtotalCents: 12000,
  lineDiscountTotalCents: 0,
  invoiceDiscountTotalCents: 0,
  discountTotalCents: 0,
  gstTotalCents: 1200,
  totalCents: 13200,
  amountPaidCents: 0,
  balanceCents: 13200,
  payments: [],
  notes: "",
  paymentInstructionsSnapshot: {},
  creditNoteIds: [],
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

const baseCn: CreditNote = {
  id: "cn_1",
  number: "CN-0001",
  originalInvoiceId: "inv_1",
  originalInvoiceNumber: "INV-0001",
  currency: "AUD",
  clientSnapshot: { name: "Acme, Pty Ltd" },
  issueDate: "2026-05-10",
  reason: "",
  lineItems: [
    {
      description: "Refund",
      qty: -1,
      unitPriceCents: 5000,
      gstRate: 0.1,
      taxableCents: -5000,
      gstAmountCents: -500,
      lineTotalCents: -5500,
    },
  ],
  subtotalCents: -5000,
  gstTotalCents: -500,
  totalCents: -5500,
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-10T00:00:00Z",
};

describe("buildInvoicesCsv", () => {
  it("produces a header + one row per invoice + CN", () => {
    const csv = buildInvoicesCsv([baseInvoice], [baseCn]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("number");
    expect(lines[0]).toContain("status");
    expect(lines[0]).toContain("totalFormatted");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("INV-0001");
    expect(lines[1]).toContain("invoice");
    expect(lines[2]).toContain("CN-0001");
    expect(lines[2]).toContain("credit-note");
  });

  it("escapes commas and quotes per RFC-4180", () => {
    const csv = buildInvoicesCsv([baseInvoice], []);
    expect(csv).toContain('"Acme, Pty Ltd"');
  });
});

describe("buildLineItemsCsv", () => {
  it("emits one row per line + CN line with FK number", () => {
    const csv = buildLineItemsCsv([baseInvoice], [baseCn]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("INV-0001");
    expect(lines[1]).toContain('"Service ""A"""');
    expect(lines[2]).toContain("CN-0001");
    expect(lines[2]).toContain("Refund");
  });
});
