import {
  canTransition,
  deriveDisplayStatus,
  isMutable,
  summarizeStatuses,
} from "@/src/lib/invoice-status";
import type { Invoice } from "@/src/types/schemas";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_1",
    number: "INV-0001",
    status: "draft",
    currency: "AUD",
    clientId: null,
    clientSnapshot: { name: "Test Co" },
    issueDate: "2026-05-01",
    dueDate: "2026-05-15",
    lineItems: [],
    subtotalCents: 0,
    discountTotalCents: 0,
    gstTotalCents: 0,
    totalCents: 0,
    amountPaidCents: 0,
    balanceCents: 0,
    payments: [],
    notes: "",
    paymentInstructionsSnapshot: {},
    creditNoteIds: [],
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("canTransition", () => {
  it("allows draft → sent", () => {
    expect(canTransition("draft", "sent")).toBe(true);
  });
  it("blocks draft → paid (must go via sent)", () => {
    expect(canTransition("draft", "paid")).toBe(false);
  });
  it("blocks paid → anything", () => {
    expect(canTransition("paid", "sent")).toBe(false);
    expect(canTransition("paid", "partial")).toBe(false);
  });
  it("blocks identity transitions", () => {
    expect(canTransition("draft", "draft")).toBe(false);
  });
});

describe("isMutable", () => {
  it("is true only for drafts", () => {
    expect(isMutable(makeInvoice({ status: "draft" }))).toBe(true);
    expect(isMutable(makeInvoice({ status: "sent" }))).toBe(false);
    expect(isMutable(makeInvoice({ status: "partial" }))).toBe(false);
    expect(isMutable(makeInvoice({ status: "paid" }))).toBe(false);
  });
});

describe("deriveDisplayStatus", () => {
  const today = new Date("2026-05-15T12:00:00Z");

  it("returns draft for drafts regardless of due date", () => {
    const inv = makeInvoice({ status: "draft", dueDate: "2026-04-01" });
    expect(deriveDisplayStatus(inv, today)).toBe("draft");
  });

  it("returns paid for paid regardless of due date", () => {
    const inv = makeInvoice({ status: "paid", dueDate: "2026-04-01" });
    expect(deriveDisplayStatus(inv, today)).toBe("paid");
  });

  it("returns overdue when sent and due is past", () => {
    const inv = makeInvoice({ status: "sent", dueDate: "2026-05-14" });
    expect(deriveDisplayStatus(inv, today)).toBe("overdue");
  });

  it("returns sent when sent and due is today", () => {
    const inv = makeInvoice({ status: "sent", dueDate: "2026-05-15" });
    expect(deriveDisplayStatus(inv, today)).toBe("sent");
  });

  it("returns sent when sent and due is future", () => {
    const inv = makeInvoice({ status: "sent", dueDate: "2026-06-01" });
    expect(deriveDisplayStatus(inv, today)).toBe("sent");
  });

  it("returns overdue when partial and due is past", () => {
    const inv = makeInvoice({ status: "partial", dueDate: "2026-05-14" });
    expect(deriveDisplayStatus(inv, today)).toBe("overdue");
  });
});

describe("summarizeStatuses", () => {
  const today = new Date("2026-05-15T00:00:00Z");
  it("counts each bucket correctly and ignores soft-deleted", () => {
    const invoices = [
      makeInvoice({ id: "1", status: "draft" }),
      makeInvoice({ id: "2", status: "sent", dueDate: "2026-06-01" }),
      makeInvoice({ id: "3", status: "sent", dueDate: "2026-04-01" }),
      makeInvoice({ id: "4", status: "paid" }),
      makeInvoice({ id: "5", status: "draft", deletedAt: "2026-05-15T00:00:00Z" }),
    ];
    expect(summarizeStatuses(invoices, today)).toEqual({
      draft: 1,
      sent: 1,
      partial: 0,
      paid: 1,
      overdue: 1,
    });
  });
});
