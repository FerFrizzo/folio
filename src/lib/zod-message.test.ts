import { z } from "zod";
import { errorMessage } from "@/src/lib/zod-message";
import { InvoiceSchema } from "@/src/types/schemas";

function issueFrom(schema: z.ZodTypeAny, value: unknown): unknown {
  const parsed = schema.safeParse(value);
  if (parsed.success) throw new Error("expected the parse to fail");
  return parsed.error;
}

// Mirrors NON_EMPTY in schemas.ts:9 — the custom "Required" message is what the
// app's real fields carry, so fixtures must use it to assert real output.
const required = z.string().min(1, "Required");

describe("errorMessage", () => {
  // Regression: the toast showed err.message, and ZodError.message is a JSON
  // dump of every issue — that's what the user saw on screen.
  it("turns a ZodError on a known path into a sentence", () => {
    const err = issueFrom(
      z.object({ clientSnapshot: z.object({ name: required }) }),
      { clientSnapshot: { name: "" } },
    );
    expect(errorMessage(err, "Save failed.")).toBe("Client name: Required");
  });

  it("never returns the raw JSON dump", () => {
    const err = issueFrom(InvoiceSchema, { clientSnapshot: { name: "" } });
    const message = errorMessage(err, "Save failed.");
    expect(message).not.toContain("{");
    expect(message).not.toContain("too_small");
  });

  it("labels issue and due dates", () => {
    const err = issueFrom(z.object({ issueDate: required }), { issueDate: "" });
    expect(errorMessage(err, "Save failed.")).toBe("Issue date: Required");
  });

  it("falls back to the dotted path when the field is unmapped", () => {
    const err = issueFrom(
      z.object({ lineItems: z.array(z.object({ qty: z.number() })) }),
      { lineItems: [{ qty: "two" }] },
    );
    expect(errorMessage(err, "Save failed.")).toMatch(/^lineItems\.0\.qty: /);
  });

  it("reports only the first issue when several fail", () => {
    const err = issueFrom(
      z.object({ issueDate: required, dueDate: required }),
      { issueDate: "", dueDate: "" },
    );
    expect(errorMessage(err, "Save failed.")).toBe("Issue date: Required");
  });

  it("uses the bare message for a root-level issue", () => {
    const err = issueFrom(z.string(), 42);
    expect(errorMessage(err, "Save failed.")).not.toContain(":");
  });

  it("passes a plain Error's message through", () => {
    expect(errorMessage(new Error("offline"), "Save failed.")).toBe("offline");
  });

  it("uses the fallback for a thrown non-Error", () => {
    expect(errorMessage("nope", "Save failed.")).toBe("Save failed.");
    expect(errorMessage(undefined, "Save failed.")).toBe("Save failed.");
  });
});
