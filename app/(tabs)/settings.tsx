import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/src/components/ui/Card";
import { AboutCard } from "@/src/features/settings/AboutCard";
import { SubscriptionCard } from "@/src/features/settings/SubscriptionCard";
import { BusinessProfileForm } from "@/src/features/settings/BusinessProfileForm";
import { DataCard } from "@/src/features/settings/DataCard";
import { EmailDefaultsCard } from "@/src/features/settings/EmailDefaultsCard";
import { LineItemLibraryCard } from "@/src/features/settings/LineItemLibraryCard";
import { LogoPicker } from "@/src/features/settings/LogoPicker";
import { NumberingCard } from "@/src/features/settings/NumberingCard";
import { PaymentDetailsForm } from "@/src/features/settings/PaymentDetailsForm";
import { ThemeCard } from "@/src/features/settings/ThemeCard";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
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
          <SubscriptionCard />

          <Card>
            <Text className="text-h2 text-foreground">Logo</Text>
            <View className="mt-3">
              <LogoPicker />
            </View>
          </Card>

          <BusinessProfileForm />
          <PaymentDetailsForm />
          <NumberingCard />
          <EmailDefaultsCard />
          <LineItemLibraryCard />
          <ThemeCard />
          <DataCard />
          <AboutCard />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
