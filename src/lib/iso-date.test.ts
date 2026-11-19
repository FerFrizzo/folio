import {
  dateEntryError,
  dateFromIso,
  formatIsoDate,
  isoFromDate,
  isRealIsoDate,
} from "@/src/lib/iso-date";

describe("isRealIsoDate", () => {
  it("accepts a real calendar day", () => {
    expect(isRealIsoDate("2026-12-18")).toBe(true);
    expect(isRealIsoDate("2024-02-29")).toBe(true);
  });

  it("rejects a shape that is not a day, including a day count", () => {
    expect(isRealIsoDate("")).toBe(false);
    expect(isRealIsoDate("30")).toBe(false);
    expect(isRealIsoDate("18/12/2026")).toBe(false);
    expect(isRealIsoDate("18 Dec 2026")).toBe(false);
    expect(isRealIsoDate("2026-02-31")).toBe(false);
    expect(isRealIsoDate("2025-02-29")).toBe(false);
    expect(isRealIsoDate("2026-13-01")).toBe(false);
  });
});

describe("dateEntryError", () => {
  it("treats blank as no date", () => {
    expect(dateEntryError(undefined)).toBeNull();
    expect(dateEntryError(null)).toBeNull();
    expect(dateEntryError("")).toBeNull();
    expect(dateEntryError("   ")).toBeNull();
  });

  it("accepts a trimmed calendar date", () => {
    expect(dateEntryError(" 2026-12-18 ")).toBeNull();
  });

  it("explains free text instead of dropping it", () => {
    expect(dateEntryError("30")).toBe(
      "Choose a calendar date, such as 18 Dec 2026.",
    );
    expect(dateEntryError("next week")).toBe(
      "Choose a calendar date, such as 18 Dec 2026.",
    );
    expect(dateEntryError("18/12/2026")).toBe(
      "Choose a calendar date, such as 18 Dec 2026.",
    );
  });
});

describe("formatIsoDate", () => {
  it("renders a friendly day", () => {
    expect(formatIsoDate("2026-12-18")).toBe("18 Dec 2026");
    expect(formatIsoDate("2026-05-01")).toBe("1 May 2026");
  });

  it("returns null for anything the field should reject", () => {
    expect(formatIsoDate("30")).toBeNull();
    expect(formatIsoDate("2026-02-31")).toBeNull();
  });
});

describe("picker date conversion", () => {
  it("round-trips a local calendar day", () => {
    const date = dateFromIso("2026-12-18");
    expect(date).not.toBeNull();
    expect(isoFromDate(date as Date)).toBe("2026-12-18");
  });

  it("uses the local day from a Date the picker returns", () => {
    expect(isoFromDate(new Date(2026, 11, 18, 15, 30))).toBe("2026-12-18");
  });
});
