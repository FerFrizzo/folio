import {
  acceptDueDate,
  dueDateDraftPatch,
  optionalDueDate,
  requireOptionalDueDate,
} from "@/src/lib/due-date";

describe("dueDateDraftPatch", () => {
  it("clears a blank or whitespace due date", () => {
    expect(dueDateDraftPatch("")).toEqual({ dueDate: "" });
    expect(dueDateDraftPatch("   ")).toEqual({ dueDate: "" });
  });

  it("keeps a trimmed calendar date", () => {
    expect(dueDateDraftPatch(" 2026-06-02 ")).toEqual({
      dueDate: "2026-06-02",
    });
  });

  it("leaves a half-typed date unsaved", () => {
    expect(dueDateDraftPatch("2026-06")).toEqual({});
  });

  it("leaves a day count or other free text unsaved", () => {
    expect(dueDateDraftPatch("30")).toEqual({});
    expect(dueDateDraftPatch("18/12/2026")).toEqual({});
  });
});

describe("acceptDueDate", () => {
  it("keeps a calendar date and clears a blank", () => {
    expect(acceptDueDate(" 2026-12-18 ")).toEqual({
      ok: true,
      date: "2026-12-18",
    });
    expect(acceptDueDate("")).toEqual({ ok: true });
    expect(acceptDueDate("   ")).toEqual({ ok: true });
  });

  it("returns an error for free text instead of treating it as no date", () => {
    expect(acceptDueDate("30")).toEqual({
      ok: false,
      message: "Choose a calendar date, such as 18 Dec 2026.",
    });
    expect(acceptDueDate("18/12/2026").ok).toBe(false);
    expect(acceptDueDate("2026-02-31").ok).toBe(false);
  });
});

describe("optional due date storage", () => {
  it("treats blank and null as no date", () => {
    expect(optionalDueDate(undefined)).toBeUndefined();
    expect(optionalDueDate(null)).toBeUndefined();
    expect(optionalDueDate("  ")).toBeUndefined();
    expect(requireOptionalDueDate("")).toBeUndefined();
  });

  it("rejects a non-date on the write path and omits it from a preview", () => {
    expect(optionalDueDate("next week")).toBeUndefined();
    expect(() => requireOptionalDueDate("next week")).toThrow(/YYYY-MM-DD/);
  });
});
