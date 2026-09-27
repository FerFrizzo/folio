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
const mockCreateClient = jest.fn();
jest.mock("@/src/lib/firestore/clients", () => ({
  createClient: (...a: unknown[]) => mockCreateClient(...a),
}));

import { useCreateClient } from "@/src/features/clients/queries";

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

it("tracks client_created after a successful create", async () => {
  mockCreateClient.mockResolvedValueOnce({ id: "c1" });
  const { result } = renderHook(() => useCreateClient(), { wrapper });
  await act(() => result.current.mutateAsync({} as never));
  expect(mockTrack).toHaveBeenCalledWith("client_created");
});

it("emits nothing when the create fails", async () => {
  mockCreateClient.mockRejectedValueOnce(new Error("denied"));
  const { result } = renderHook(() => useCreateClient(), { wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync({} as never)).rejects.toThrow("denied");
  });
  expect(mockTrack).not.toHaveBeenCalled();
});
