const mockStore = new Map<string, string>();
jest.mock("@/src/lib/deviceStorage", () => ({
  deviceStorage: {
    getItem: async (k: string) => mockStore.get(k) ?? null,
    setItem: async (k: string, v: string) => void mockStore.set(k, v),
    removeItem: async (k: string) => void mockStore.delete(k),
  },
}));

import { hasSignedInBefore, markSignedIn } from "@/src/features/auth/authPrefs";

beforeEach(() => mockStore.clear());

it("is false on a fresh install", async () => {
  expect(await hasSignedInBefore()).toBe(false);
});

it("is true after markSignedIn", async () => {
  await markSignedIn();
  expect(await hasSignedInBefore()).toBe(true);
});

it("treats unreadable storage as a fresh install", async () => {
  const { deviceStorage } = jest.requireMock("@/src/lib/deviceStorage");
  const spy = jest.spyOn(deviceStorage, "getItem").mockRejectedValueOnce(new Error("locked"));
  expect(await hasSignedInBefore()).toBe(false);
  spy.mockRestore();
});

it("never throws when storage cannot be written", async () => {
  const { deviceStorage } = jest.requireMock("@/src/lib/deviceStorage");
  const spy = jest.spyOn(deviceStorage, "setItem").mockRejectedValueOnce(new Error("full"));
  await expect(markSignedIn()).resolves.toBeUndefined();
  spy.mockRestore();
});
