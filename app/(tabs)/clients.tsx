import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/src/components/ui/EmptyState";

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View className="px-4">
        <Text className="text-h1 text-foreground">Clients</Text>
      </View>
      <EmptyState
        title="Clients list arrives in Phase 2."
        description="Search, add, and edit clients with a soft-delete guardrail when invoices reference them."
      />
    </ScrollView>
  );
}
