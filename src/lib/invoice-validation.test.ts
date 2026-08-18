import { draftBlocker, sendBlocker } from "@/src/lib/invoice-validation";
import type { ClientSnapshot } from "@/src/types/schemas";

const client: ClientSnapshot = { name: "Acme Pty Ltd" };

function sendable(overrides: Partial<Parameters<typeof sendBlocker>[0]> = {}) {
  return {
    clientSnapshot: client,
    lineCount: 1,
    issueDate: "2026-08-04",
    totalCents: 11000,
    discountTotalCents: 0,
    grossSubtotalCents: 10000,
    ...overrides,
  };
}

describe("draftBlocker", () => {
  it("lets a draft with a client through", () => {
    expect(draftBlocker({ clientSnapshot: client })).toBeNull();
  });

  // Regression: Save draft persisted unconditionally, so an empty name reached
  // InvoiceSchema (name is NON_EMPTY) and surfaced as a raw ZodError.
  it("blocks a draft with no client", () => {
    expect(draftBlocker({ clientSnapshot: { name: "" } })).toBe(
      "Pick a client first.",
    );
  });

  it("blocks a whitespace-only client name", () => {
    expect(draftBlocker({ clientSnapshot: { name: "   " } })).toBe(
      "Pick a client first.",
    );
  });
});

describe("sendBlocker", () => {
  it("lets a complete invoice through", () => {
    expect(sendBlocker(sendable())).toBeNull();
  });

  it("blocks an invoice with no client", () => {
    expect(sendBlocker(sendable({ clientSnapshot: { name: "" } }))).toBe(
      "Pick a client first.",
    );
  });

  // The old inline check used a bare falsy test, so " " passed here and then
  // satisfied the schema's min(1) — an invoice addressed to nobody.
  it("blocks a whitespace-only client name", () => {
    expect(sendBlocker(sendable({ clientSnapshot: { name: "  " } }))).toBe(
      "Pick a client first.",
    );
  });

  it("blocks an invoice with no line items", () => {
    expect(sendBlocker(sendable({ lineCount: 0 }))).toBe(
      "Add at least one line item.",
    );
  });

  it("blocks a missing issue date", () => {
    expect(sendBlocker(sendable({ issueDate: "" }))).toBe(
      "Issue date is required.",
    );
  });

  // Due Date was removed from the invoice entirely, so an invoice with no
  // due date at all must still be sendable.
  it("allows an invoice with no due date", () => {
    expect(sendBlocker(sendable())).toBeNull();
  });

  it("blocks a zero total", () => {
    expect(sendBlocker(sendable({ totalCents: 0 }))).toBe(
      "Total must be greater than zero.",
    );
  });

  it("blocks a discount larger than the subtotal", () => {
    expect(
      sendBlocker(
        sendable({ discountTotalCents: 15000, grossSubtotalCents: 10000 }),
      ),
    ).toBe("Total discount can't exceed the subtotal.");
  });

  it("allows a discount equal to the subtotal", () => {
    expect(
      sendBlocker(
        sendable({ discountTotalCents: 10000, grossSubtotalCents: 10000 }),
      ),
    ).toBeNull();
  });

  // Order matters: the user should be told the most fundamental problem first.
  it("reports the missing client before the missing lines", () => {
    expect(
      sendBlocker(sendable({ clientSnapshot: { name: "" }, lineCount: 0 })),
    ).toBe("Pick a client first.");
  });
});
