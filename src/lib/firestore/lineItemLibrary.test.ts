import { createLibraryEntry } from "@/src/lib/firestore/lineItemLibrary";
import type { LineItemLibraryInput } from "@/src/types/schemas";

const mockSetDoc = jest.fn(async () => {});

jest.mock("@/src/lib/firebase", () => ({
  getFirebaseFirestore: () => ({}),
}));

jest.mock("firebase/firestore", () => ({
  collection: () => ({}),
  doc: () => ({ id: "entry-1" }),
  setDoc: (...args: unknown[]) => mockSetDoc(...(args as [])),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: class {},
}));

const validInput: LineItemLibraryInput = {
  description: "Hour of design work",
  defaultQty: 1,
  unitPriceCents: 12000,
  gstRate: 0.1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createLibraryEntry", () => {
  it("writes the entry and returns it parsed", async () => {
    const entry = await createLibraryEntry("uid1", validInput);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(entry.id).toBe("entry-1");
    expect(entry.description).toBe("Hour of design work");
  });

  // Same ordering defect as createDraft: description is NON_EMPTY, so a blank
  // one must not leave a document behind. Both UI callers guard against this
  // today, which is exactly why the data layer needs its own guarantee.
  it("writes nothing when the description is empty", async () => {
    await expect(
      createLibraryEntry("uid1", { ...validInput, description: "" }),
    ).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
