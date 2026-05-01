import { fromCents, formatMoney } from "@/src/lib/money";
import { toSnapshot } from "dinero.js";

describe("money", () => {
  it("round-trips integer cents through Dinero", () => {
    const d = fromCents(132000, "AUD");
    expect(toSnapshot(d).amount).toBe(132000);
    expect(toSnapshot(d).currency.code).toBe("AUD");
    expect(toSnapshot(d).scale).toBe(2);
  });

  it("formats AUD with comma thousands separators", () => {
    expect(formatMoney(132000, "AUD")).toBe("$1,320.00");
    expect(formatMoney(0, "AUD")).toBe("$0.00");
    expect(formatMoney(99, "AUD")).toBe("$0.99");
    expect(formatMoney(123456789, "AUD")).toBe("$1,234,567.89");
  });

  it("formats USD with US$ prefix", () => {
    expect(formatMoney(50000, "USD")).toBe("US$500.00");
  });
});
