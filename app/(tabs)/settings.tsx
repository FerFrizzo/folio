import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/src/components/ui/Card";
import { BusinessProfileForm } from "@/src/features/settings/BusinessProfileForm";
import { LogoPicker } from "@/src/features/settings/LogoPicker";
import { PaymentDetailsForm } from "@/src/features/settings/PaymentDetailsForm";
import { SecurityCard } from "@/src/features/settings/SecurityCard";
import { ThemeCard } from "@/src/features/settings/ThemeCard";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 48,
        gap: 16,
      }}
    >
      <View className="px-4">
        <Text className="text-h1 text-foreground">Settings</Text>
      </View>

      <View className="gap-4 px-4">
        <Card>
          <Text className="text-h2 text-foreground">Logo</Text>
          <View className="mt-3">
            <LogoPicker />
          </View>
        </Card>

        <BusinessProfileForm />
        <PaymentDetailsForm />

        <Card>
          <Text className="text-h2 text-foreground">Numbering</Text>
          <Text className="mt-1 text-caption text-muted">
            Auto · INV-0001, INV-0002, … Custom formats land in Phase 3.
          </Text>
        </Card>

        <ThemeCard />
        <SecurityCard />

        <Card>
          <Text className="text-h2 text-foreground">Data</Text>
          <Text className="mt-1 text-caption text-muted">
            Archived view + CSV / PDF ZIP exports land in Phase 3.
          </Text>
        </Card>

        <Card>
          <Text className="text-h2 text-foreground">About</Text>
          <Text className="mt-1 text-caption text-muted">
            Privacy policy, terms, and changelog land in Phase 5 ahead of
            store submission.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
