const mockIsAvailable = jest.fn(async () => true);
const mockHasAction = jest.fn(async () => true);
const mockRequestReview = jest.fn(async () => {});
jest.mock("expo-store-review", () => ({
  isAvailableAsync: () => mockIsAvailable(),
  hasAction: () => mockHasAction(),
  requestReview: () => mockRequestReview(),
}));

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

jest.mock("@/src/lib/deviceStorage", () => jest.requireActual("@/src/test-utils/deviceStorageMock"));

import { mockDeviceStore } from "@/src/test-utils/deviceStorageMock";
import { recordInvoicePaid, recordInvoiceSent, type ReviewDeps } from "@/src/features/review";
import { loadReviewState } from "@/src/features/review/store";

const NOW = new Date("2026-10-01T00:00:00.000Z");
const deps: ReviewDeps = { now: () => NOW, sleep: async () => {}, platform: "ios" };

beforeEach(() => {
  jest.clearAllMocks();
  mockDeviceStore.clear();
  mockIsAvailable.mockResolvedValue(true);
  mockHasAction.mockResolvedValue(true);
});

describe("recordInvoicePaid", () => {
  it("prompts once and tracks it", async () => {
    await recordInvoicePaid(deps);
    await recordInvoicePaid(deps);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("review_prompt_shown", { trigger: "first_paid" });
  });

  it("persists state before prompting", async () => {
    mockRequestReview.mockImplementationOnce(async () => {
      const s = await loadReviewState();
      expect(s.firedTriggers).toContain("first_paid");
      expect(s.lastPromptAt).toBe(NOW.toISOString());
    });
    await recordInvoicePaid(deps);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("does nothing on web", async () => {
    await recordInvoicePaid({ ...deps, platform: "web" });
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(mockIsAvailable).not.toHaveBeenCalled();
  });

  it("does nothing when the store review sheet is unavailable", async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    await recordInvoicePaid(deps);
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect((await loadReviewState()).firedTriggers).toEqual([]);
  });

  it("never throws when the SDK throws", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequestReview.mockRejectedValueOnce(new Error("boom"));
    await expect(recordInvoicePaid(deps)).resolves.toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe("recordInvoiceSent", () => {
  it("counts sends and prompts on the third", async () => {
    await recordInvoiceSent(deps);
    await recordInvoiceSent(deps);
    expect(mockRequestReview).not.toHaveBeenCalled();
    await recordInvoiceSent(deps);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("review_prompt_shown", { trigger: "third_sent" });
    expect((await loadReviewState()).sentCount).toBe(3);
  });

  it("still counts sends on web without prompting", async () => {
    const web = { ...deps, platform: "web" };
    await recordInvoiceSent(web);
    await recordInvoiceSent(web);
    await recordInvoiceSent(web);
    expect((await loadReviewState()).sentCount).toBe(3);
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("is held back by the cooldown after a first_paid prompt", async () => {
    await recordInvoicePaid(deps);
    await recordInvoiceSent(deps);
    await recordInvoiceSent(deps);
    await recordInvoiceSent(deps);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });
});
