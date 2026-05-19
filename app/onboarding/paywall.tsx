import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import RevenueCatUI from "react-native-purchases-ui";
import { Button } from "@/src/components/ui/Button";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useAuth } from "@/src/features/auth/AuthProvider";

export default function OnboardingPaywall() {
  const router = useRouter();
  const qc = useQueryClient();
  const auth = useAuth();
  const dismiss = useOnboardingStore((s) => s.dismiss);

  function finish() {
    dismiss();
    router.replace("/(tabs)/dashboard");
  }

  async function onPurchased() {
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
      <RevenueCatUI.Paywall
        onPurchaseCompleted={onPurchased}
        onRestoreCompleted={onPurchased}
        onDismiss={finish}
      />
      <View className="mt-2">
        <Button label="Continue with free" variant="ghost" onPress={finish} />
      </View>
    </OnboardingShell>
  );
}
