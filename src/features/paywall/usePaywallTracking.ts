import { useEffect } from "react";
import { track, type PaywallSource } from "@/src/lib/analytics";

// Structural subset of RevenueCat's onPurchaseCompleted argument, so this module
// stays testable without the native SDK.
export type PurchaseResult = {
  customerInfo: { entitlements: { active: Record<string, { periodType: string }> } };
  storeTransaction: { productIdentifier: string };
};

export function purchaseProps(p: PurchaseResult): { is_trial: boolean; product_id: string } {
  const active = Object.values(p.customerInfo.entitlements.active);
  return {
    is_trial: active.some((e) => e.periodType === "TRIAL"),
    product_id: p.storeTransaction.productIdentifier,
  };
}

export function usePaywallTracking(source: PaywallSource) {
  useEffect(() => {
    track("paywall_viewed", { source });
  }, [source]);

  return {
    onPurchaseCompleted: (p: PurchaseResult) =>
      track("purchase_completed", { source, ...purchaseProps(p) }),
    onRestoreCompleted: () => track("purchase_restored", { source }),
    onDismissed: () => track("paywall_dismissed", { source }),
  };
}
