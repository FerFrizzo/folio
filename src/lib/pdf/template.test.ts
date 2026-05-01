import { renderInvoiceHtml } from "@/src/lib/pdf/template";
import type { Invoice, Profile, Settings } from "@/src/types/schemas";
import { SettingsSchema, ProfileSchema } from "@/src/types/schemas";

const profile: Profile = ProfileSchema.parse({
  businessName: "Frizzo Studio",
  abn: "53004085616",
  address: "12 Gertrude St, Fitzroy VIC 3065",
  email: "hi@frizzo.example",
  phone: "0400 000 000",
});

const settings: Settings = SettingsSchema.parse({
  paymentDetails: {
    bsb: "063-123",
    accNumber: "1234 5678",
    accName: "Frizzo Studio",
    payId: "hi@frizzo.example",
  },
});

const invoice: Invoice = {
  id: "inv_1",
  number: "INV-0001",
  status: "sent",
  currency: "AUD",
  clientId: "c1",
  clientSnapshot: {
    name: "Acme Pty Ltd",
    abn: "53004085616",
    address: "1 Acme Way, Sydney NSW 2000",
  },
  issueDate: "2026-05-01",
  dueDate: "2026-05-15",
  lineItems: [
    {
      description: "Brand identity package",
      qty: 1,
      unitPriceCents: 120000,
      gstRate: 0.1,
      gstAmountCents: 12000,
      lineTotalCents: 132000,
    },
  ],
  subtotalCents: 120000,
  discountTotalCents: 0,
  gstTotalCents: 12000,
  totalCents: 132000,
  amountPaidCents: 0,
  balanceCents: 132000,
  payments: [],
  notes: "Thanks for the work!",
  paymentInstructionsSnapshot: settings.paymentDetails,
  creditNoteIds: [],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("renderInvoiceHtml", () => {
  it("includes the ATO mandatory 'Tax Invoice' heading", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).toContain(">Tax Invoice<");
  });

  it("includes the business name and ABN", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).toContain("Frizzo Studio");
    expect(html).toContain("ABN 53 004 085 616");
  });

  it("includes the buyer name and ABN", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).toContain("Acme Pty Ltd");
    expect(html).toContain("ABN 53 004 085 616");
  });

  it("renders the GST line for AUD invoices", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).toContain("GST");
    expect(html).toContain("$120.00"); // GST = $120
    expect(html).toContain("$1,320.00"); // total
  });

  it("hides GST and shows the export note for non-AUD invoices", () => {
    const usdInv: Invoice = {
      ...invoice,
      currency: "USD",
      gstTotalCents: 0,
      lineItems: invoice.lineItems.map((l) => ({ ...l, gstRate: 0, gstAmountCents: 0 })),
      totalCents: 120000,
    };
    const html = renderInvoiceHtml({ invoice: usdInv, profile, settings });
    expect(html).toContain("Treated as an export");
    // No "GST" line in the totals block
    expect(html.match(/<span class="label">GST<\/span>/)).toBeNull();
  });

  it("escapes HTML in user-provided strings", () => {
    const evilInv: Invoice = {
      ...invoice,
      clientSnapshot: { name: "<script>alert(1)</script>" },
      notes: "<img src=x onerror=alert(1)>",
    };
    const html = renderInvoiceHtml({ invoice: evilInv, profile, settings });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes payment details when provided", () => {
    const html = renderInvoiceHtml({ invoice, profile, settings });
    expect(html).toContain("BSB");
    expect(html).toContain("063-123");
    expect(html).toContain("PayID");
  });
});
