import { dueDateDraftPatch, optionalDueDate, requireOptionalDueDate } from "@/src/lib/due-date";

describe("dueDateDraftPatch", () => {
  it("clears a blank or whitespace due date", () => {
    expect(dueDateDraftPatch("")).toEqual({ dueDate: "" });
    expect(dueDateDraftPatch("   ")).toEqual({ dueDate: "" });
  });

  it("keeps a trimmed calendar date", () => {
    expect(dueDateDraftPatch(" 2026-06-02 ")).toEqual({ dueDate: "2026-06-02" });
  });

  it("leaves a half-typed date unsaved", () => {
    expect(dueDateDraftPatch("2026-06")).toEqual({});
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
