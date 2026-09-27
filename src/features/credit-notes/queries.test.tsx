import { type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";

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

// React Query batches observer notifications on setTimeout(0), which lands
// after act() returns. Notify synchronously so every update stays inside act.
beforeAll(() => notifyManager.setScheduler((cb) => cb()));
afterAll(() => notifyManager.setScheduler((cb) => setTimeout(cb, 0)));

// One client per test with gcTime: Infinity so no GC timers are scheduled
// (they would keep Jest alive after the run); cleared after each test.
let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
});
afterEach(() => qc.clear());

it("tracks credit_note_created after a successful create", async () => {
  mockCreateCreditNote.mockResolvedValueOnce({ id: "cn1", originalInvoiceId: "inv-1" });
  const { result } = renderHook(() => useCreateCreditNote(), { wrapper });
  await act(() => result.current.mutateAsync({} as never));
  expect(mockTrack).toHaveBeenCalledWith("credit_note_created");
});
