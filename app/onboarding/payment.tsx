import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { PaymentDetailsForm } from "@/src/features/settings/PaymentDetailsForm";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { useEntitlement } from "@/src/features/settings/queries";
import { track } from "@/src/lib/analytics";

export default function OnboardingPayment() {
  const router = useRouter();
  const entitlement = useEntitlement();
  // Last data step: free users see the Pro offer before landing on the dashboard.
  const next = () =>
    router.replace(entitlement === "pro" ? "/(tabs)/dashboard" : "/onboarding/paywall");
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
            next();
          }}
        />
        <Button
          label="Done"
          onPress={() => {
            track("onboarding_step_completed", { step: "payment", skipped: false });
            next();
          }}
        />
      </View>
    </OnboardingShell>
  );
}
