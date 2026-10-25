import { deleteField } from "firebase/firestore";
import {
  getInvoice,
  listInvoices,
  recordPayment,
  removePayment,
  restoreInvoice,
  updateDraft,
  updatePayment,
} from "@/src/lib/firestore/invoices";

const mockState: {
  doc: Record<string, unknown> | null;
  updates: Record<string, unknown>[];
} = {
  doc: null,
  updates: [],
};

jest.mock("@/src/lib/firebase", () => ({
  getFirebaseFirestore: () => ({}),
}));

jest.mock("firebase/firestore", () => ({
  collection: () => ({ path: "invoices" }),
  doc: () => ({ id: "inv-1", path: "users/u1/invoices/inv-1" }),
  getDoc: async () => ({
    exists: () => mockState.doc != null,
    id: "inv-1",
    data: () => mockState.doc,
  }),
  getDocs: async () => ({
    docs: mockState.doc
      ? [{ id: "inv-1", data: () => mockState.doc }]
      : [],
  }),
  updateDoc: async (_ref: unknown, data: Record<string, unknown>) => {
    mockState.updates.push(data);
  },
  deleteField: () => ({ __op: "deleteField" }),
  deleteDoc: jest.fn(),
  runTransaction: async (
    _db: unknown,
    fn: (tx: {
      get: () => Promise<{ exists: () => boolean; data: () => Record<string, unknown> | null }>;
      update: (ref: unknown, data: Record<string, unknown>) => void;
    }) => Promise<unknown>,
  ) =>
    fn({
      get: async () => ({
        exists: () => mockState.doc != null,
        data: () => mockState.doc,
      }),
      update: (_ref, data) => {
        mockState.updates.push(data);
      },
    }),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
  Timestamp: class {},
}));

function invoiceDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: "INV-0001",
    status: "paid",
    currency: "AUD",
    clientId: null,
    clientSnapshot: { name: "Acme Pty Ltd" },
    issueDate: "2026-05-01",
    lineItems: [],
    subtotalCents: 10000,
    gstTotalCents: 1000,
    totalCents: 11000,
    amountPaidCents: 11000,
    balanceCents: 0,
    payments: [{ date: "2026-05-02", amountCents: 11000, method: "Bank transfer" }],
    notes: "",
    paymentInstructionsSnapshot: {},
    creditNoteIds: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    paidAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockState.doc = null;
  mockState.updates = [];
});

describe("reading invoices after a payment change", () => {
  it("still returns an invoice whose due date was stored as null", async () => {
    mockState.doc = invoiceDoc({ dueDate: null, status: "sent" });
    const invoice = await getInvoice("u1", "inv-1");
    expect(invoice?.id).toBe("inv-1");
    expect(invoice?.dueDate).toBeUndefined();
  });

  it("still returns an invoice whose paidAt was stored as null", async () => {
    mockState.doc = invoiceDoc({ paidAt: null, status: "sent", amountPaidCents: 0, balanceCents: 11000, payments: [] });
    const invoice = await getInvoice("u1", "inv-1");
    expect(invoice?.id).toBe("inv-1");
    expect(invoice?.paidAt).toBeUndefined();
    expect(invoice?.status).toBe("sent");
  });

  it("still lists an invoice restored with deletedAt null", async () => {
    mockState.doc = invoiceDoc({ deletedAt: null, status: "sent" });
    const invoices = await listInvoices("u1", { includeDeleted: true });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.deletedAt).toBeUndefined();
  });
});

describe("removePayment", () => {
  it("drops a full payment and leaves the invoice sent with nothing paid", async () => {
    mockState.doc = invoiceDoc();
    const result = await removePayment("u1", "inv-1", 0);
    const update = mockState.updates[0];
    expect(result.status).toBe("sent");
    expect(update?.payments).toEqual([]);
    expect(update?.amountPaidCents).toBe(0);
    expect(update?.balanceCents).toBe(11000);
    expect(update?.status).toBe("sent");
    expect(update?.paidAt).toEqual(deleteField());
  });

  it("drops one partial payment and recomputes from the payments that remain", async () => {
    mockState.doc = invoiceDoc({
      status: "partial",
      paidAt: null,
      amountPaidCents: 4000,
      balanceCents: 7000,
      payments: [
        { date: "2026-05-02", amountCents: 4000, method: "Cash" },
        { date: "2026-05-03", amountCents: 2000, method: "Card" },
      ],
    });
    const result = await removePayment("u1", "inv-1", 0);
    const update = mockState.updates[0];
    expect(result.status).toBe("partial");
    expect(update?.payments).toEqual([
      { date: "2026-05-03", amountCents: 2000, method: "Card" },
    ]);
    expect(update?.amountPaidCents).toBe(2000);
    expect(update?.balanceCents).toBe(9000);
    expect(update?.status).toBe("partial");
    expect(update?.paidAt).toEqual(deleteField());
  });
});

describe("reading a payment saved without a date", () => {
  it("still returns the invoice when the date field is null or missing", async () => {
    mockState.doc = invoiceDoc({
      payments: [
        { date: null, amountCents: 4000, method: "Cash" },
        { amountCents: 2000, method: "Card" },
      ],
    });
    const invoice = await getInvoice("u1", "inv-1");
    expect(invoice?.payments.map((p) => p.date)).toEqual([undefined, undefined]);
    expect(invoice?.payments[0]?.amountCents).toBe(4000);
  });
});

describe("recordPayment", () => {
  it("stores a payment with no date field when the date is left blank", async () => {
    mockState.doc = invoiceDoc({
      status: "sent",
      paidAt: null,
      amountPaidCents: 0,
      balanceCents: 11000,
      payments: [],
    });
    await recordPayment("u1", "inv-1", { amountCents: 4000, method: "Cash", date: "  " });
    expect(mockState.updates[0]?.payments).toEqual([
      { amountCents: 4000, method: "Cash" },
    ]);
  });
});

describe("updatePayment", () => {
  it("lowers a full payment to a partial amount and recalculates status", async () => {
    mockState.doc = invoiceDoc();
    const result = await updatePayment("u1", "inv-1", 0, {
      date: "2026-05-02",
      amountCents: 4000,
      method: "Bank transfer",
    });
    const update = mockState.updates[0];
    expect(result.status).toBe("partial");
    expect(update?.payments).toEqual([
      { date: "2026-05-02", amountCents: 4000, method: "Bank transfer" },
    ]);
    expect(update?.amountPaidCents).toBe(4000);
    expect(update?.balanceCents).toBe(7000);
    expect(update?.status).toBe("partial");
    expect(update?.paidAt).toEqual(deleteField());
  });

  it("clears the date when the edit leaves it blank", async () => {
    mockState.doc = invoiceDoc();
    await updatePayment("u1", "inv-1", 0, {
      date: "",
      amountCents: 11000,
      method: "Bank transfer",
    });
    expect(mockState.updates[0]?.payments).toEqual([
      { amountCents: 11000, method: "Bank transfer" },
    ]);
  });

  it("rejects a date that is not YYYY-MM-DD", async () => {
    mockState.doc = invoiceDoc();
    await expect(
      updatePayment("u1", "inv-1", 0, { date: "yesterday", amountCents: 11000 }),
    ).rejects.toThrow(/YYYY-MM-DD/);
    expect(mockState.updates).toEqual([]);
  });
});

describe("restoreInvoice", () => {
  it("clears deletedAt instead of writing null", async () => {
    await restoreInvoice("u1", "inv-1");
    expect(mockState.updates[0]?.deletedAt).toEqual(deleteField());
  });
});

describe("updateDraft due date", () => {
  it("removes the field when the due date is cleared", async () => {
    await updateDraft("u1", "inv-1", { dueDate: "" });
    expect(mockState.updates[0]?.dueDate).toEqual(deleteField());
  });

  it("removes the field when the due date is only whitespace", async () => {
    await updateDraft("u1", "inv-1", { dueDate: "   " });
    expect(mockState.updates[0]?.dueDate).toEqual(deleteField());
  });

  it("stores a trimmed due date", async () => {
    await updateDraft("u1", "inv-1", { dueDate: " 2026-06-02 " });
    expect(mockState.updates[0]?.dueDate).toBe("2026-06-02");
  });
});
