jest.mock("@/src/lib/deviceStorage", () => jest.requireActual("@/src/test-utils/deviceStorageMock"));

import { useOnboardingStore } from "@/src/features/onboarding/store";
import { deviceStorage, mockDeviceStore } from "@/src/test-utils/deviceStorageMock";

const KEY = "folio.onboarding.dismissed";

beforeEach(() => {
  jest.clearAllMocks();
  mockDeviceStore.clear();
  useOnboardingStore.setState({ dismissed: false });
});

describe("useOnboardingStore", () => {
  it("hydrates as not dismissed when nothing is stored", async () => {
    await useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState().dismissed).toBe(false);
  });

  it("hydrates a persisted dismissal", async () => {
    mockDeviceStore.set(KEY, "1");
    await useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState().dismissed).toBe(true);
  });

  it("dismiss updates state immediately and persists", async () => {
    useOnboardingStore.getState().dismiss();
    expect(useOnboardingStore.getState().dismissed).toBe(true);
    await Promise.resolve();
    expect(deviceStorage.setItem).toHaveBeenCalledWith(KEY, "1");
    expect(mockDeviceStore.get(KEY)).toBe("1");
  });

  it("reset clears state and storage", async () => {
    mockDeviceStore.set(KEY, "1");
    useOnboardingStore.setState({ dismissed: true });
    await useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().dismissed).toBe(false);
    expect(mockDeviceStore.has(KEY)).toBe(false);
  });
});
