import { readLibraryEntryInput } from "@/src/lib/library-entry";

function read(overrides: Partial<Parameters<typeof readLibraryEntryInput>[0]> = {}) {
  return readLibraryEntryInput({
    description: "Hour of design work",
    qty: "2",
    unitPriceText: "120.00",
    ...overrides,
  });
}

describe("readLibraryEntryInput", () => {
  it("parses a valid entry", () => {
    expect(read()).toEqual({
      ok: true,
      entry: {
        description: "Hour of design work",
        defaultQty: 2,
        unitPriceCents: 12000,
      },
    });
  });

  it("trims the description", () => {
    const result = read({ description: "  Consulting  " });
    expect(result.ok && result.entry.description).toBe("Consulting");
  });

  it("rejects a blank description", () => {
    expect(read({ description: "   " })).toEqual({
      ok: false,
      message: "Add a description first.",
    });
  });

  // Regression: qty and price went through `Number(x) || fallback`, which lets a
  // negative through (it's truthy). That reached the schema's nonnegative()
  // check and came back as a raw ZodError in the toast.
  it("rejects a negative quantity", () => {
    expect(read({ qty: "-2" })).toEqual({
      ok: false,
      message: "Quantity can't be negative.",
    });
  });

  it("rejects a negative price", () => {
    expect(read({ unitPriceText: "-5" })).toEqual({
      ok: false,
      message: "Price can't be negative.",
    });
  });

  it("reports the blank description before a negative number", () => {
    expect(read({ description: "", qty: "-2" })).toEqual({
      ok: false,
      message: "Add a description first.",
    });
  });

  it.each(["abc", "", "0"])(
    "falls back to a quantity of 1 for %p",
    (qty) => {
      const result = read({ qty });
      expect(result.ok && result.entry.defaultQty).toBe(1);
    },
  );

  it("falls back to a price of zero for unparseable or empty input", () => {
    const blank = read({ unitPriceText: "" });
    expect(blank.ok && blank.entry.unitPriceCents).toBe(0);
    const junk = read({ unitPriceText: "abc" });
    expect(junk.ok && junk.entry.unitPriceCents).toBe(0);
  });

  it("converts dollars to whole cents", () => {
    const result = read({ unitPriceText: "12.34" });
    expect(result.ok && result.entry.unitPriceCents).toBe(1234);
  });
});
