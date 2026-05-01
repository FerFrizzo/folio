import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { LogoPicker } from "@/src/features/settings/LogoPicker";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";

export default function OnboardingLogo() {
  const router = useRouter();
  return (
    <OnboardingShell
      stepIndex={1}
      title="Add your logo"
      description="Optional. Resized to ≤500 px wide."
    >
      <Card>
        <LogoPicker />
      </Card>
      <View className="flex-row justify-between gap-2">
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => router.push("/onboarding/payment")}
        />
        <Button
          label="Next: Payment"
          onPress={() => router.push("/onboarding/payment")}
        />
      </View>
    </OnboardingShell>
  );
}
