import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { Button } from "@/src/components/ui/Button";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { usePaywallTracking, type PurchaseResult } from "@/src/features/paywall/usePaywallTracking";

function hasRevenueCatKey(): boolean {
  if (Platform.OS === "web") return false;
  const key =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return !!key && Constants.executionEnvironment !== "storeClient";
}

// Like app/paywall.tsx: only mount the RevenueCat paywall once the SDK is
// configured (RevenueCatInitializer runs async in the root layout).
function useRevenueCatReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hasRevenueCatKey()) return;
    let cancelled = false;
    void Purchases.isConfigured().then((configured) => {
      if (!cancelled && configured) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

export default function OnboardingPaywall() {
  const router = useRouter();
  const rcReady = useRevenueCatReady();
  const qc = useQueryClient();
  const auth = useAuth();
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const events = usePaywallTracking("onboarding");

  function finish() {
    dismiss();
    router.replace("/(tabs)/dashboard");
  }

  async function onPurchased(result?: PurchaseResult) {
    if (result) events.onPurchaseCompleted(result);
    if (auth.status === "ready") {
      await qc.invalidateQueries({ queryKey: ["subscription", auth.user.uid] });
    }
    finish();
  }

  return (
    <OnboardingShell
      stepIndex={3}
      title="Unlock Folio Pro"
      description="30-day free trial — cancel any time. Includes email sending and watermark-free PDFs."
    >
      {rcReady ? (
        <RevenueCatUI.Paywall
          onPurchaseCompleted={(r) => void onPurchased(r)}
          onRestoreCompleted={() => {
            events.onRestoreCompleted();
            void onPurchased();
          }}
          onDismiss={() => {
            events.onDismissed();
            finish();
          }}
        />
      ) : null}
      <View className="mt-2">
        <Button
          label="Continue with free"
          variant="ghost"
          onPress={() => {
            events.onDismissed();
            finish();
          }}
        />
      </View>
    </OnboardingShell>
  );
}
