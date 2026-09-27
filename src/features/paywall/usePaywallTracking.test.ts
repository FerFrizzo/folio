import { renderHook } from "@testing-library/react-native";

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

import { purchaseProps, usePaywallTracking } from "@/src/features/paywall/usePaywallTracking";

const trial = {
  customerInfo: { entitlements: { active: { pro: { periodType: "TRIAL" } } } },
  storeTransaction: { productIdentifier: "folio_pro_monthly" },
};
const paid = {
  customerInfo: { entitlements: { active: { pro: { periodType: "NORMAL" } } } },
  storeTransaction: { productIdentifier: "folio_pro_annual" },
};

beforeEach(() => jest.clearAllMocks());

describe("purchaseProps", () => {
  it("detects a trial", () => {
    expect(purchaseProps(trial)).toEqual({ is_trial: true, product_id: "folio_pro_monthly" });
  });
  it("detects a paid purchase", () => {
    expect(purchaseProps(paid)).toEqual({ is_trial: false, product_id: "folio_pro_annual" });
  });
  it("is not a trial when no entitlement is active yet", () => {
    const none = { ...paid, customerInfo: { entitlements: { active: {} } } };
    expect(purchaseProps(none).is_trial).toBe(false);
  });
});

describe("usePaywallTracking", () => {
  it("tracks paywall_viewed once on mount with the source", () => {
    const { rerender } = renderHook(() => usePaywallTracking("watermark"));
    rerender({});
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("paywall_viewed", { source: "watermark" });
  });

  it("tracks purchase, restore and dismiss with the source", () => {
    const { result } = renderHook(() => usePaywallTracking("settings"));
    result.current.onPurchaseCompleted(trial);
    result.current.onRestoreCompleted();
    result.current.onDismissed();
    expect(mockTrack).toHaveBeenCalledWith("purchase_completed", {
      source: "settings",
      is_trial: true,
      product_id: "folio_pro_monthly",
    });
    expect(mockTrack).toHaveBeenCalledWith("purchase_restored", { source: "settings" });
    expect(mockTrack).toHaveBeenCalledWith("paywall_dismissed", { source: "settings" });
  });
});
