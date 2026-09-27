// In-memory stand-in for @/src/lib/deviceStorage. Wire it up with
//   jest.mock("@/src/lib/deviceStorage", () => jest.requireActual("@/src/test-utils/deviceStorageMock"));
// then import `mockDeviceStore` from here to seed or inspect values, and clear
// it in beforeEach. The factory's requireActual and the test's import resolve to the
// same module instance, so both see one store.

export const mockDeviceStore = new Map<string, string>();

export const deviceStorage = {
  getItem: jest.fn(async (key: string) => mockDeviceStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockDeviceStore.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockDeviceStore.delete(key);
  }),
};
