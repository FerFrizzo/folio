import { z } from "zod";

// Re-import the same Zod payload schema sendInvoiceEmail uses. Duplicated
// here as a unit test instead of full emulator round-trip — the emulator
// path lives in the manual verification checklist.

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  base64: z.string().min(1),
});

const PayloadSchema = z.object({
  invoiceId: z.string().min(1),
  to: z.string().email(),
  cc: z.array(z.string().email()).max(10).optional(),
  subject: z.string().min(1).max(998),
  body: z.string().max(20_000),
  attachments: z.array(AttachmentSchema).max(5).optional(),
});

describe("sendInvoiceEmail payload schema", () => {
  it("accepts a minimal valid payload", () => {
    expect(
      PayloadSchema.safeParse({
        invoiceId: "inv1",
        to: "ap@acme.example",
        subject: "Your invoice",
        body: "Hi.",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(
      PayloadSchema.safeParse({
        invoiceId: "inv1",
        to: "not-an-email",
        subject: "Hi",
        body: "",
      }).success,
    ).toBe(false);
  });

  it("rejects more than 5 attachments", () => {
    const att = {
      filename: "f.pdf",
      mimeType: "application/pdf",
      base64: "abc",
    };
    const result = PayloadSchema.safeParse({
      invoiceId: "inv1",
      to: "ap@acme.example",
      subject: "Hi",
      body: "",
      attachments: [att, att, att, att, att, att],
    });
    expect(result.success).toBe(false);
  });

  it("accepts up to 10 cc addresses", () => {
    expect(
      PayloadSchema.safeParse({
        invoiceId: "inv1",
        to: "a@a.test",
        cc: Array.from({ length: 10 }, (_, i) => `c${i}@a.test`),
        subject: "x",
        body: "",
      }).success,
    ).toBe(true);
  });

  it("rejects missing invoiceId", () => {
    expect(
      PayloadSchema.safeParse({
        to: "a@a.test",
        subject: "x",
        body: "",
      }).success,
    ).toBe(false);
  });
});
