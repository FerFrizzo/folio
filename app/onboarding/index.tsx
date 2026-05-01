import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { OnboardingShell } from "@/src/features/onboarding/OnboardingShell";
import { BusinessProfileForm } from "@/src/features/settings/BusinessProfileForm";

export default function OnboardingProfile() {
  const router = useRouter();
  return (
    <OnboardingShell
      stepIndex={0}
      title="Business profile"
      description="Appears on every invoice. You can fill this in later."
    >
      <BusinessProfileForm />
      <View className="flex-row justify-between gap-2">
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => router.push("/onboarding/logo")}
        />
        <Button
          label="Next: Logo"
          onPress={() => router.push("/onboarding/logo")}
        />
      </View>
    </OnboardingShell>
  );
}
