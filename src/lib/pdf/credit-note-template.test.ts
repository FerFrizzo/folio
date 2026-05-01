import { renderCreditNoteHtml } from "@/src/lib/pdf/credit-note-template";
import { ProfileSchema, SettingsSchema, type CreditNote } from "@/src/types/schemas";

const profile = ProfileSchema.parse({
  businessName: "Frizzo Studio",
  abn: "53004085616",
  email: "hi@frizzo.example",
});

const settings = SettingsSchema.parse({});

const cn: CreditNote = {
  id: "cn_1",
  number: "CN-0001",
  originalInvoiceId: "inv_1",
  originalInvoiceNumber: "INV-0042",
  currency: "AUD",
  clientSnapshot: { name: "Acme Pty Ltd", abn: "53004085616" },
  issueDate: "2026-05-10",
  reason: "Refund for service not delivered.",
  lineItems: [
    {
      description: "Brand identity package",
      qty: -1,
      unitPriceCents: 50000,
      gstRate: 0.1,
      taxableCents: -50000,
      gstAmountCents: -5000,
      lineTotalCents: -55000,
    },
  ],
  subtotalCents: -50000,
  gstTotalCents: -5000,
  totalCents: -55000,
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
};

describe("renderCreditNoteHtml", () => {
  it("uses 'Credit Note' as the heading and references the original invoice", () => {
    const html = renderCreditNoteHtml({ creditNote: cn, profile, settings });
    expect(html).toContain(">Credit Note<");
    expect(html).toContain("Issued against invoice <strong>INV-0042</strong>");
  });

  it("renders the credit number and dates", () => {
    const html = renderCreditNoteHtml({ creditNote: cn, profile, settings });
    expect(html).toContain("CN-0001");
    expect(html).toContain("10 May 2026");
  });

  it("includes the reason when provided", () => {
    const html = renderCreditNoteHtml({ creditNote: cn, profile, settings });
    expect(html).toContain("Refund for service not delivered.");
  });

  it("escapes HTML in user-provided fields", () => {
    const evil: CreditNote = {
      ...cn,
      reason: "<script>alert(1)</script>",
      clientSnapshot: { name: "<img onerror=alert(1) src=x>" },
    };
    const html = renderCreditNoteHtml({ creditNote: evil, profile, settings });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img onerror=alert(1)");
  });
});
