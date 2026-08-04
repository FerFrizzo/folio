import { createDraft } from "@/src/lib/firestore/invoices";
import type { InvoiceDraftInput } from "@/src/types/schemas";

// Stubbed down to the surface createDraft touches rather than a general-purpose
// fake, so the mock can't drift from the real SDK in ways we wouldn't notice.
const mockSetDoc = jest.fn(async () => {});

jest.mock("@/src/lib/firebase", () => ({
  getFirebaseFirestore: () => ({}),
}));

jest.mock("firebase/firestore", () => ({
  collection: () => ({}),
  doc: () => ({ id: "inv-1" }),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [])),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  runTransaction: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
  Timestamp: class {},
}));

const validInput: InvoiceDraftInput = {
  clientId: null,
  clientSnapshot: { name: "Acme Pty Ltd" },
  issueDate: "2026-08-04",
  dueDate: "2026-08-18",
  currency: "AUD",
  lineItems: [],
  notes: "",
  paymentInstructionsSnapshot: {},
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createDraft", () => {
  it("writes the document and returns the parsed invoice", async () => {
    const invoice = await createDraft("uid1", validInput);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(invoice.id).toBe("inv-1");
    expect(invoice.number).toBe("DRAFT");
    expect(invoice.status).toBe("draft");
  });

  // Regression: createDraft used to setDoc first and parse second, so an
  // invalid draft was written to Firestore and *then* threw. The document that
  // remained could never be read back — toInvoice safeParses and returns null,
  // so listInvoices filtered it out and it was invisible forever.
  it("writes nothing when the client name is empty", async () => {
    await expect(
      createDraft("uid1", { ...validInput, clientSnapshot: { name: "" } }),
    ).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("writes nothing when a date is missing", async () => {
    await expect(
      createDraft("uid1", { ...validInput, issueDate: "" }),
    ).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
