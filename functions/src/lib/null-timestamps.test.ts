import { InvoiceSchema } from "./types";
import { omitNullTimestamps } from "./null-timestamps";

const invoice = {
  id: "inv-1",
  number: "INV-0001",
  status: "sent",
  currency: "AUD",
  clientId: null,
  clientSnapshot: { name: "Acme" },
  issueDate: "2026-05-01",
  lineItems: [],
  subtotalCents: 10000,
  gstTotalCents: 1000,
  totalCents: 11000,
  balanceCents: 11000,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
  paidAt: null,
  deletedAt: null,
};

describe("omitNullTimestamps", () => {
  it("lets an invoice with cleared paidAt and deletedAt parse", () => {
    const parsed = InvoiceSchema.safeParse(omitNullTimestamps(invoice));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.paidAt).toBeUndefined();
    expect(parsed.data.deletedAt).toBeUndefined();
    expect(parsed.data.status).toBe("sent");
  });
});
