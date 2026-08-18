import { invoiceFromEditorState } from "@/src/lib/invoice-preview";
import { InvoiceSchema, type LineItem } from "@/src/types/schemas";

const line: LineItem = {
  description: "Consulting",
  qty: 2,
  unitPriceCents: 15000,
  gstRate: 0.1,
  lineDiscountAmountCents: 0,
  taxableCents: 30000,
  gstAmountCents: 3000,
  lineTotalCents: 33000,
};

function build(overrides: Partial<Parameters<typeof invoiceFromEditorState>[0]> = {}) {
  return invoiceFromEditorState({
    id: "inv-1",
    number: "INV-0005",
    status: "draft",
    currency: "AUD",
    clientId: "client-1",
    clientSnapshot: { name: "Acme Pty Ltd" },
    issueDate: "2026-08-04",
    dueDate: "2026-08-18",
    lineItems: [line],
    totals: {
      subtotalCents: 30000,
      lineDiscountTotalCents: 0,
      invoiceDiscountTotalCents: 0,
      discountTotalCents: 0,
      gstTotalCents: 3000,
      totalCents: 33000,
    },
    notes: "Thanks!",
    paymentInstructionsSnapshot: {},
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    ...overrides,
  });
}

describe("invoiceFromEditorState", () => {
  // The preview and the sent PDF are rendered from this same object, so it has
  // to be a fully valid Invoice — not a near-enough shape.
  it("produces an object the Invoice schema accepts", () => {
    expect(() => InvoiceSchema.parse(build())).not.toThrow();
  });

  it("carries the identity and status it is given", () => {
    const invoice = build({ number: "ACME-9", status: "sent" });
    expect(invoice.number).toBe("ACME-9");
    expect(invoice.status).toBe("sent");
  });

  it("maps the totals onto the invoice", () => {
    const invoice = build();
    expect(invoice.subtotalCents).toBe(30000);
    expect(invoice.gstTotalCents).toBe(3000);
    expect(invoice.totalCents).toBe(33000);
  });

  // A fresh invoice has nothing paid, so the whole total is outstanding.
  it("starts unpaid with the full balance outstanding", () => {
    const invoice = build();
    expect(invoice.amountPaidCents).toBe(0);
    expect(invoice.balanceCents).toBe(33000);
    expect(invoice.payments).toEqual([]);
  });

  it("omits the discount key entirely when there is no discount", () => {
    expect("invoiceDiscount" in build()).toBe(false);
  });

  it("carries the discount when there is one", () => {
    const invoice = build({ invoiceDiscount: { type: "pct", value: 1000 } });
    expect(invoice.invoiceDiscount).toEqual({ type: "pct", value: 1000 });
  });

  it("omits sentAt for a draft and carries it for a sent invoice", () => {
    expect("sentAt" in build()).toBe(false);
    expect(build({ sentAt: "2026-08-04T10:00:00.000Z" }).sentAt).toBe(
      "2026-08-04T10:00:00.000Z",
    );
  });

  // Due Date was removed from the editor entirely, so the built invoice must
  // still validate against the schema with no dueDate at all.
  it("omits the dueDate key entirely when the editor supplies none", () => {
    const invoice = build({ dueDate: undefined });
    expect("dueDate" in invoice).toBe(false);
    expect(() => InvoiceSchema.parse(invoice)).not.toThrow();
  });

  it("keeps a client-less draft renderable, so preview works before a client is picked", () => {
    const invoice = build({ clientId: null, clientSnapshot: { name: "" } });
    expect(invoice.clientId).toBeNull();
    expect(invoice.clientSnapshot.name).toBe("");
  });
});
