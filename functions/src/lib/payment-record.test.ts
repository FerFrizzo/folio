import { InvoiceSchema, PaymentRecordSchema, ProfileSchema, SettingsSchema } from "./types";
import { renderInvoiceHtml } from "./template-snapshot/invoice-pro";
import { renderCreditNoteHtml } from "./template-snapshot/credit-note";

describe("InvoiceSchema due date", () => {
  const invoice = {
    id: "inv-1",
    number: "INV-0001",
    status: "sent" as const,
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

  it("treats a null or blank due date as absent", () => {
    expect(InvoiceSchema.parse({ ...invoice, dueDate: null }).dueDate).toBeUndefined();
    expect(InvoiceSchema.parse({ ...invoice, dueDate: "  " }).dueDate).toBeUndefined();
  });
});

describe("invoice PDF due date", () => {
  const profile = ProfileSchema.parse({ businessName: "Frizzo Studio" });
  const settings = SettingsSchema.parse({});
  const invoice = {
    id: "inv-1",
    number: "INV-0001",
    status: "sent" as const,
    currency: "AUD" as const,
    clientId: null,
    clientSnapshot: { name: "Acme" },
    issueDate: "2026-05-01",
    dueDate: "   ",
    lineItems: [],
    subtotalCents: 10000,
    lineDiscountTotalCents: 0,
    invoiceDiscountTotalCents: 0,
    discountTotalCents: 0,
    gstTotalCents: 0,
    totalCents: 10000,
    amountPaidCents: 0,
    balanceCents: 10000,
    payments: [],
    notes: "",
    paymentInstructionsSnapshot: {},
    creditNoteIds: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };

  it("omits the due-date line when the due date is blank", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).not.toContain(">Due<");
    expect(html).toContain(">Issued<");
  });

  it("prints the due date when one is set", () => {
    const html = renderInvoiceHtml({
      invoice: { ...invoice, dueDate: "2026-06-02" },
      profile,
      settings,
    });
    expect(html).toContain(">Due<");
    expect(html).toContain("02 Jun 2026");
  });
});

describe("PaymentRecordSchema date", () => {
  it("accepts a missing, blank, or null date", () => {
    expect(PaymentRecordSchema.parse({ amountCents: 100 }).date).toBeUndefined();
    expect(PaymentRecordSchema.parse({ amountCents: 100, date: "" }).date).toBeUndefined();
    expect(PaymentRecordSchema.parse({ amountCents: 100, date: null }).date).toBeUndefined();
  });

  it("lets an invoice with an undated payment parse", () => {
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
      payments: [{ amountCents: 50, date: null }],
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(parsed.payments[0]?.date).toBeUndefined();
  });
});

describe("invoice PDF payment date", () => {
  const profile = ProfileSchema.parse({ businessName: "Frizzo Studio" });
  const settings = SettingsSchema.parse({});
  const invoice = {
    id: "inv-1",
    number: "INV-0001",
    status: "partial" as const,
    currency: "AUD" as const,
    clientId: null,
    clientSnapshot: { name: "Acme" },
    issueDate: "2026-05-01",
    lineItems: [],
    subtotalCents: 10000,
    lineDiscountTotalCents: 0,
    invoiceDiscountTotalCents: 0,
    discountTotalCents: 0,
    gstTotalCents: 0,
    totalCents: 10000,
    amountPaidCents: 6234,
    balanceCents: 3766,
    payments: [
      { date: "2026-07-04", amountCents: 1234, method: "Cash" },
      { amountCents: 5000, method: "Card" },
    ],
    notes: "",
    paymentInstructionsSnapshot: {},
    creditNoteIds: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };

  it("omits the date line when a payment has no date", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    const start = html.indexOf('<section class="received">');
    const received = html.slice(start, html.indexOf("</section>", start));
    expect(received.match(/class="received-date"/g)).toHaveLength(1);
    expect(received).toContain("04 Jul 2026");
    expect(received).toContain("$50.00");
    expect(received).not.toContain("—");
    expect(received).not.toMatch(/<span>\s*<\/span>/);
  });
});

describe("credit note PDF", () => {
  it("does not render a payment date", () => {
    const html = renderCreditNoteHtml({
      creditNote: {
        id: "cn-1",
        number: "CN-0001",
        originalInvoiceId: "inv-1",
        originalInvoiceNumber: "INV-0001",
        currency: "AUD",
        clientSnapshot: { name: "Acme" },
        issueDate: "2026-05-10",
        reason: "",
        lineItems: [],
        subtotalCents: 0,
        gstTotalCents: 0,
        totalCents: 0,
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
      },
      profile: ProfileSchema.parse({ businessName: "Frizzo Studio" }),
      settings: SettingsSchema.parse({}),
    });
    expect(html).not.toContain("received-date");
    expect(html).not.toContain("Payment date");
  });
});
