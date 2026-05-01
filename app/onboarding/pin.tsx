import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { SecurityCard } from "@/src/features/settings/SecurityCard";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { useOnboardingStore } from "@/src/features/onboarding/store";

export default function OnboardingPin() {
  const router = useRouter();
  const dismiss = useOnboardingStore((s) => s.dismiss);

  function finish() {
    dismiss();
    router.replace("/dashboard");
  }

  return (
    <OnboardingShell
      stepIndex={3}
      title="Set a PIN"
      description="Optional. Locks the app on launch; unlocks via biometric on supported devices."
    >
      <SecurityCard />
      <View className="flex-row justify-between gap-2">
        <Button label="Skip" variant="ghost" onPress={finish} />
        <Button label="Done — open Folio" onPress={finish} />
      </View>
    </OnboardingShell>
  );
}
