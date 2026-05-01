import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { PaymentDetailsForm } from "@/src/features/settings/PaymentDetailsForm";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";

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
          onPress={() => router.push("/onboarding/pin")}
        />
        <Button
          label="Next: PIN"
          onPress={() => router.push("/onboarding/pin")}
        />
      </View>
    </OnboardingShell>
  );
}
