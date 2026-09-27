import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { PaymentDetailsForm } from "@/src/features/settings/PaymentDetailsForm";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { track } from "@/src/lib/analytics";

export default function OnboardingPayment() {
  const router = useRouter();
  return (
    <OnboardingShell
      stepIndex={2}
      title="Payment details"
      description="How clients should pay you. Snapshotted onto every invoice when you save it."
    >
      <PaymentDetailsForm />
      <View className="flex-row justify-between gap-2">
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => {
            track("onboarding_step_completed", { step: "payment", skipped: true });
            router.replace("/(tabs)/dashboard");
          }}
        />
        <Button
          label="Done"
          onPress={() => {
            track("onboarding_step_completed", { step: "payment", skipped: false });
            router.replace("/(tabs)/dashboard");
          }}
        />
      </View>
    </OnboardingShell>
  );
}
