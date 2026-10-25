import { createCreditNote, newCreditNoteId } from "@/src/lib/firestore/creditNotes";

const mockDocs = new Map<string, Record<string, unknown>>();
let mockGenerated = 0;

const mockClaim = jest.fn(async () => ({ counter: 1, number: "CN-0001" }));

jest.mock("@/src/lib/firebase", () => ({
  getFirebaseFirestore: () => ({}),
}));

jest.mock("@/src/lib/firestore/counters", () => ({
  claimNextCreditNoteNumberInTransaction: () => mockClaim(),
}));

jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (parent: { path?: string }, path?: string, id?: string) => {
    if (typeof path === "string" && typeof id === "string") {
      return { path: `${path}/${id}`, id };
    }
    if (typeof path === "string") {
      const leaf = path.split("/").pop() ?? path;
      return { path, id: leaf };
    }
    mockGenerated += 1;
    const next = `gen-${mockGenerated}`;
    return { path: `${parent.path}/${next}`, id: next };
  },
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteField: () => ({ __op: "deleteField" }),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: class {},
  runTransaction: async (
    _db: unknown,
    fn: (tx: {
      get: (ref: { path: string; id: string }) => Promise<{
        exists: () => boolean;
        id: string;
        data: () => Record<string, unknown>;
      }>;
      set: (ref: { path: string }, data: Record<string, unknown>) => void;
      update: (ref: { path: string }, data: Record<string, unknown>) => void;
    }) => Promise<unknown>,
  ) =>
    fn({
      get: async (ref) => {
        const data = mockDocs.get(ref.path);
        return {
          exists: () => data != null,
          id: ref.id,
          data: () => data ?? {},
        };
      },
      set: (ref, data) => {
        mockDocs.set(ref.path, data);
      },
      update: (ref, data) => {
        mockDocs.set(ref.path, { ...(mockDocs.get(ref.path) ?? {}), ...data });
      },
    }),
}));

const input = {
  originalInvoiceId: "inv-1",
  originalInvoiceNumber: "INV-0001",
  currency: "AUD" as const,
  clientSnapshot: { name: "Acme Pty Ltd" },
  issueDate: "2026-06-01",
  reason: "Cancelled",
  lineItems: [
    {
      description: "Work",
      qty: -1,
      unitPriceCents: 10000,
      gstRate: 0.1,
      taxableCents: -10000,
      gstAmountCents: -1000,
      lineTotalCents: -11000,
    },
  ],
};

beforeEach(() => {
  mockDocs.clear();
  mockGenerated = 0;
  mockClaim.mockClear();
  mockClaim.mockResolvedValue({ counter: 1, number: "CN-0001" });
  mockDocs.set("users/u1/invoices/inv-1", { creditNoteIds: [] });
});

describe("createCreditNote", () => {
  it("returns the existing credit note when the same client id is submitted again", async () => {
    const first = await createCreditNote("u1", input, "cn-client");
    const second = await createCreditNote("u1", input, "cn-client");
    expect(second.id).toBe(first.id);
    expect(second.number).toBe("CN-0001");
    expect(mockClaim).toHaveBeenCalledTimes(1);
    const invoice = mockDocs.get("users/u1/invoices/inv-1");
    expect(invoice?.creditNoteIds).toEqual(["cn-client"]);
  });

  it("issues separate credit notes for different ids", async () => {
    mockClaim
      .mockResolvedValueOnce({ counter: 1, number: "CN-0001" })
      .mockResolvedValueOnce({ counter: 2, number: "CN-0002" });
    const a = await createCreditNote("u1", input, "cn-a");
    const b = await createCreditNote("u1", input, "cn-b");
    expect([a.number, b.number]).toEqual(["CN-0001", "CN-0002"]);
    expect(mockDocs.get("users/u1/invoices/inv-1")?.creditNoteIds).toEqual(["cn-a", "cn-b"]);
  });

  // Regression: an existing doc that failed to parse was overwritten with a
  // new number.
  it("refuses to overwrite an existing credit note it can't read", async () => {
    mockDocs.set("users/u1/creditNotes/cn-bad", { number: 42 });
    await expect(createCreditNote("u1", input, "cn-bad")).rejects.toThrow(/couldn't be read/);
    expect(mockDocs.get("users/u1/creditNotes/cn-bad")).toEqual({ number: 42 });
    expect(mockClaim).not.toHaveBeenCalled();
  });
});

describe("newCreditNoteId", () => {
  it("returns a fresh id each call", () => {
    expect(newCreditNoteId("u1")).not.toBe(newCreditNoteId("u1"));
  });
});
