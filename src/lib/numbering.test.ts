import { formatAutoNumber, parseAutoNumber } from "@/src/lib/numbering";

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

describe("parseAutoNumber", () => {
  it("returns the sequence for a matching prefix + digits", () => {
    expect(parseAutoNumber("INV-0001", "INV-")).toBe(1);
    expect(parseAutoNumber("INV-0042", "INV-")).toBe(42);
    expect(parseAutoNumber("INV-12345", "INV-")).toBe(12345);
  });

  it("round-trips with formatAutoNumber", () => {
    expect(parseAutoNumber(formatAutoNumber({ prefix: "INV-", counter: 7 }), "INV-")).toBe(7);
  });

  it("returns null when the prefix doesn't match", () => {
    expect(parseAutoNumber("INV-0001", "CN-")).toBeNull();
    expect(parseAutoNumber("2026-A/12", "INV-")).toBeNull();
  });

  it("returns null for a non-numeric or empty remainder", () => {
    expect(parseAutoNumber("INV-", "INV-")).toBeNull();
    expect(parseAutoNumber("INV-00A1", "INV-")).toBeNull();
  });
});
