import { isValidAbn } from "@/src/lib/abn";
import { CreditNoteSchema, InvoiceSchema } from "@/src/types/schemas";
import { DEMO_CLIENTS, DEMO_PROFILE, buildCreditNote, buildInvoices } from "./demo-data";

describe("store screenshot demo data", () => {
  const invoices = buildInvoices();

  it("produces invoices that parse with the app's schema, so the app can read them", () => {
    for (const inv of invoices) expect(() => InvoiceSchema.parse(inv)).not.toThrow();
  });

  it("numbers issued invoices sequentially and leaves drafts unnumbered", () => {
    const issued = invoices.filter((i) => i.status !== "draft").map((i) => i.number);
    expect(issued).toEqual(issued.map((_, i) => `INV-${String(i + 1).padStart(4, "0")}`));
    expect(invoices.filter((i) => i.status === "draft").every((i) => i.number === "DRAFT")).toBe(true);
  });

  it("keeps balance, payments and status consistent", () => {
    for (const inv of invoices) {
      const paid = inv.payments.reduce((a, p) => a + p.amountCents, 0);
      expect(inv.amountPaidCents).toBe(paid);
      expect(inv.balanceCents).toBe(inv.totalCents - paid);
      if (inv.status === "paid") expect(inv.balanceCents).toBe(0);
      if (inv.status === "partial") expect(paid).toBeGreaterThan(0);
      if (inv.status === "sent") expect(paid).toBe(0);
    }
  });

  it("covers every status the screenshots show", () => {
    const statuses = new Set(invoices.map((i) => i.status));
    expect([...statuses].sort()).toEqual(["draft", "paid", "partial", "sent"]);
  });

  it("uses checksum-valid ABNs for the business and its clients", () => {
    expect(isValidAbn(DEMO_PROFILE.abn)).toBe(true);
    for (const c of DEMO_CLIENTS) if (c.abn) expect(isValidAbn(c.abn)).toBe(true);
  });

  it("issues a negative credit note against an existing invoice that links back to it", () => {
    const cn = CreditNoteSchema.parse(buildCreditNote(invoices));
    const original = invoices.find((i) => i.id === cn.originalInvoiceId);
    expect(original?.number).toBe(cn.originalInvoiceNumber);
    expect(original?.creditNoteIds).toContain(cn.id);
    expect(cn.totalCents).toBeLessThan(0);
    expect(cn.totalCents).toBe(cn.subtotalCents + cn.gstTotalCents);
  });
});
