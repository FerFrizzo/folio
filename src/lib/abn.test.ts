import { isValidAbn, formatAbn, normalizeAbn } from "@/src/lib/abn";

describe("isValidAbn", () => {
  // ATO-published example ABNs that pass the checksum.
  it.each([
    "53004085616", // ATO public example — Australian Taxation Office's own
    "51824753556", // Test ABN published in ATO docs
  ])("accepts valid ABN %s", (abn) => {
    expect(isValidAbn(abn)).toBe(true);
  });

  it("accepts spaces between digits", () => {
    expect(isValidAbn("53 004 085 616")).toBe(true);
  });

  it("rejects an ABN with the wrong checksum", () => {
    expect(isValidAbn("12345678901")).toBe(false);
  });

  it("rejects non-11-digit input", () => {
    expect(isValidAbn("1234567890")).toBe(false);  // 10 digits
    expect(isValidAbn("123456789012")).toBe(false); // 12 digits
    expect(isValidAbn("")).toBe(false);
    expect(isValidAbn("not-a-number")).toBe(false);
  });
});

describe("formatAbn", () => {
  it("groups as 2-3-3-3", () => {
    expect(formatAbn("53004085616")).toBe("53 004 085 616");
  });
  it("returns input unchanged if not 11 digits", () => {
    expect(formatAbn("123")).toBe("123");
  });
});

describe("normalizeAbn", () => {
  it("strips whitespace", () => {
    expect(normalizeAbn("53 004 085 616")).toBe("53004085616");
    expect(normalizeAbn("  53004085616  ")).toBe("53004085616");
  });
});
