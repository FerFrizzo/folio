import { getInvoiceCounter, setInvoiceCounter } from "@/src/lib/firestore/counters";

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn(async () => {});

jest.mock("@/src/lib/firebase", () => ({
  getFirebaseFirestore: () => ({}),
}));

jest.mock("firebase/firestore", () => ({
  doc: () => ({}),
  getDoc: (...args: unknown[]) => mockGetDoc(...(args as [])),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [])),
  runTransaction: jest.fn(),
}));

function snapshot(data: Record<string, unknown> | null) {
  return { exists: () => data !== null, data: () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getInvoiceCounter", () => {
  it("reads the counter the allocation transaction uses", async () => {
    mockGetDoc.mockResolvedValue(snapshot({ invoiceCounter: 7, creditNoteCounter: 2 }));
    await expect(getInvoiceCounter("uid1")).resolves.toBe(7);
  });

  // A fresh account has no counters document; the first invoice is number 1.
  it("returns 0 when the document doesn't exist yet", async () => {
    mockGetDoc.mockResolvedValue(snapshot(null));
    await expect(getInvoiceCounter("uid1")).resolves.toBe(0);
  });

  it("defaults a document missing the field to 0", async () => {
    mockGetDoc.mockResolvedValue(snapshot({}));
    await expect(getInvoiceCounter("uid1")).resolves.toBe(0);
  });
});

describe("setInvoiceCounter", () => {
  // Merge matters: creditNoteCounter lives in the same document and must
  // survive a write that only means to move the invoice counter.
  it("merges so the credit-note counter survives", async () => {
    await setInvoiceCounter("uid1", 12);
    expect(mockSetDoc).toHaveBeenCalledWith({}, { invoiceCounter: 12 }, { merge: true });
  });

  it("clamps a negative to zero", async () => {
    await setInvoiceCounter("uid1", -3);
    expect(mockSetDoc).toHaveBeenCalledWith({}, { invoiceCounter: 0 }, { merge: true });
  });

  it("floors a fractional value", async () => {
    await setInvoiceCounter("uid1", 4.9);
    expect(mockSetDoc).toHaveBeenCalledWith({}, { invoiceCounter: 4 }, { merge: true });
  });
});
