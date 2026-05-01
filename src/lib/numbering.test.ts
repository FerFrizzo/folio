import { formatAutoNumber } from "@/src/lib/numbering";

describe("formatAutoNumber", () => {
  it("zero-pads to 4 digits by default", () => {
    expect(formatAutoNumber({ prefix: "INV-", counter: 1 })).toBe("INV-0001");
    expect(formatAutoNumber({ prefix: "INV-", counter: 42 })).toBe("INV-0042");
    expect(formatAutoNumber({ prefix: "INV-", counter: 9999 })).toBe(
      "INV-9999",
    );
  });

  it("does not truncate counters larger than minDigits", () => {
    expect(formatAutoNumber({ prefix: "INV-", counter: 12345 })).toBe(
      "INV-12345",
    );
  });

  it("respects a custom minDigits", () => {
    expect(
      formatAutoNumber({ prefix: "CN-", counter: 1, minDigits: 3 }),
    ).toBe("CN-001");
  });

  it("throws on counter < 1", () => {
    expect(() =>
      formatAutoNumber({ prefix: "INV-", counter: 0 }),
    ).toThrow();
  });
});
