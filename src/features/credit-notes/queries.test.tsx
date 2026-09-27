import { act, renderHook } from "@testing-library/react-native";
import { setupQueryHookTests } from "@/src/test-utils/queryHookTests";

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
jest.mock("@/src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "ready", user: { uid: "uid-1" } }),
}));
const mockCreateCreditNote = jest.fn();
jest.mock("@/src/lib/firestore/creditNotes", () => ({
  createCreditNote: (...a: unknown[]) => mockCreateCreditNote(...a),
}));
// credit-notes/queries imports invoiceKeys; stub it so the real invoice hooks
// (and their Firestore/review imports) aren't loaded.
jest.mock("@/src/features/invoices/queries", () => ({
  invoiceKeys: { detail: (uid: string, id: string) => ["invoices", uid, id] },
}));

import { useCreateCreditNote } from "@/src/features/credit-notes/queries";

const { wrapper } = setupQueryHookTests();

beforeEach(() => jest.clearAllMocks());

it("tracks credit_note_created after a successful create", async () => {
  mockCreateCreditNote.mockResolvedValueOnce({ id: "cn1", originalInvoiceId: "inv-1" });
  const { result } = renderHook(() => useCreateCreditNote(), { wrapper });
  await act(() => result.current.mutateAsync({} as never));
  expect(mockTrack).toHaveBeenCalledWith("credit_note_created");
});
