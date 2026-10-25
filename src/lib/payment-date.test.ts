import { parseOptionalPaymentDate } from "@/src/lib/payment-date";

describe("parseOptionalPaymentDate", () => {
  it("accepts a blank date", () => {
    expect(parseOptionalPaymentDate(undefined)).toEqual({ ok: true });
    expect(parseOptionalPaymentDate("")).toEqual({ ok: true });
    expect(parseOptionalPaymentDate("   ")).toEqual({ ok: true });
  });

  it("keeps a YYYY-MM-DD date", () => {
    expect(parseOptionalPaymentDate(" 2026-05-25 ")).toEqual({
      ok: true,
      date: "2026-05-25",
    });
  });

  it("rejects any other text", () => {
    expect(parseOptionalPaymentDate("yesterday")).toEqual({ ok: false });
    expect(parseOptionalPaymentDate("25/05/2026")).toEqual({ ok: false });
  });
});
