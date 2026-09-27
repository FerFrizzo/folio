import { act, renderHook } from "@testing-library/react-native";
import { setupQueryHookTests } from "@/src/test-utils/queryHookTests";

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

const { wrapper } = setupQueryHookTests();

beforeEach(() => jest.clearAllMocks());

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
