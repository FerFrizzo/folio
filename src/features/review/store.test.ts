jest.mock("@/src/lib/deviceStorage", () => jest.requireActual("@/src/test-utils/deviceStorageMock"));

import { mockDeviceStore } from "@/src/test-utils/deviceStorageMock";
import { loadReviewState, saveReviewState } from "@/src/features/review/store";
import { initialReviewState } from "@/src/features/review/rules";

const KEY = "folio.review.state";

beforeEach(() => mockDeviceStore.clear());

describe("loadReviewState", () => {
  it("returns the initial state when nothing is stored", async () => {
    expect(await loadReviewState()).toEqual(initialReviewState);
  });

  it("round-trips a saved state", async () => {
    const s = { sentCount: 2, firedTriggers: ["first_paid" as const], lastPromptAt: "2026-09-01T00:00:00.000Z" };
    await saveReviewState(s);
    expect(await loadReviewState()).toEqual(s);
  });

  // Review Focus #3: corrupt or old-shape data must never throw.
  it("falls back to the initial state on corrupt JSON", async () => {
    mockDeviceStore.set(KEY, "{not json");
    expect(await loadReviewState()).toEqual(initialReviewState);
  });

  it("fills in missing or wrong-typed fields", async () => {
    mockDeviceStore.set(KEY, JSON.stringify({ sentCount: "3", firedTriggers: ["bogus", "third_sent"] }));
    expect(await loadReviewState()).toEqual({
      sentCount: 0,
      firedTriggers: ["third_sent"],
      lastPromptAt: null,
    });
  });

  it("falls back when storage itself throws", async () => {
    const { deviceStorage } = jest.requireMock("@/src/lib/deviceStorage");
    deviceStorage.getItem.mockRejectedValueOnce(new Error("keychain locked"));
    expect(await loadReviewState()).toEqual(initialReviewState);
  });
});
