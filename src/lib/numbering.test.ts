import {
  displayInvoiceNumber,
  formatAutoNumber,
  parseAutoNumber,
  shouldPersistNumber,
  suggestNextInvoiceNumber,
} from "@/src/lib/numbering";

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

describe("suggestNextInvoiceNumber", () => {
  // The suggestion is only useful if it matches what markSent would actually
  // claim; claimNextInvoiceNumberInTransaction issues formatAutoNumber on
  // invoiceCounter + 1 (counters.ts:41-53).
  it("suggests the number a fresh account would be issued", () => {
    expect(suggestNextInvoiceNumber({ prefix: "INV-", counter: 0 })).toBe("INV-0001");
  });

  it("suggests the number after the current counter", () => {
    expect(suggestNextInvoiceNumber({ prefix: "INV-", counter: 41 })).toBe("INV-0042");
  });

  it("honours prefix and minDigits", () => {
    expect(
      suggestNextInvoiceNumber({ prefix: "ACME-", counter: 6, minDigits: 3 }),
    ).toBe("ACME-007");
  });

  it("agrees with the formula the claim transaction uses", () => {
    const counter = 17;
    const claimed = formatAutoNumber({
      prefix: "INV-",
      counter: counter + 1,
      minDigits: 4,
    });
    expect(suggestNextInvoiceNumber({ prefix: "INV-", counter })).toBe(claimed);
  });

  it("round-trips through parseAutoNumber", () => {
    const suggestion = suggestNextInvoiceNumber({ prefix: "INV-", counter: 8 });
    expect(parseAutoNumber(suggestion, "INV-")).toBe(9);
  });
});

describe("displayInvoiceNumber", () => {
  const suggestion = "INV-0005";

  it("shows what the user typed once they've edited the field", () => {
    expect(
      displayInvoiceNumber({ stored: "DRAFT", edited: true, typed: "ACME-1", suggestion }),
    ).toBe("ACME-1");
  });

  it("shows an empty string when the user has cleared the field", () => {
    expect(
      displayInvoiceNumber({ stored: "DRAFT", edited: true, typed: "", suggestion }),
    ).toBe("");
  });

  // An issued invoice already owns its number — never overwrite it with a
  // suggestion computed from the counter.
  it("prefers a stored number over the suggestion", () => {
    expect(
      displayInvoiceNumber({ stored: "INV-0002", edited: false, typed: "", suggestion }),
    ).toBe("INV-0002");
  });

  it("shows the suggestion for an unsaved draft", () => {
    expect(
      displayInvoiceNumber({ stored: "DRAFT", edited: false, typed: "", suggestion }),
    ).toBe("INV-0005");
  });

  it("falls back to DRAFT until the counter loads", () => {
    expect(
      displayInvoiceNumber({ stored: "DRAFT", edited: false, typed: "", suggestion: null }),
    ).toBe("DRAFT");
  });
});

describe("shouldPersistNumber", () => {
  const base = {
    allowManualNumber: true,
    edited: true,
    typed: "ACME-9",
    suggestion: "INV-0005",
  };

  it("persists a number the user actually chose", () => {
    expect(shouldPersistNumber(base)).toBe(true);
  });

  it("does not persist when manual numbering is off", () => {
    expect(shouldPersistNumber({ ...base, allowManualNumber: false })).toBe(false);
  });

  it("does not persist a field the user never touched", () => {
    expect(shouldPersistNumber({ ...base, edited: false })).toBe(false);
  });

  it("does not persist a cleared field", () => {
    expect(shouldPersistNumber({ ...base, typed: "   " })).toBe(false);
  });

  // The invariant that keeps numbering atomic: anything persisted here makes
  // markSent take its manual branch and skip claimNextInvoiceNumberInTransaction.
  // Typing the suggestion back in is acceptance, not an override.
  it("does not persist the suggestion typed back in", () => {
    expect(shouldPersistNumber({ ...base, typed: "INV-0005" })).toBe(false);
    expect(shouldPersistNumber({ ...base, typed: "  INV-0005  " })).toBe(false);
  });

  it("persists an edit made before the counter loaded", () => {
    expect(shouldPersistNumber({ ...base, suggestion: null })).toBe(true);
  });
});
