import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/src/components/ui/EmptyState";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View className="px-4">
        <Text className="text-h1 text-foreground">Dashboard</Text>
      </View>
      <EmptyState
        title="Dashboard arrives in Phase 2."
        description="KPI cards, needs-attention, and recent activity will land alongside real Firestore data."
      />
    </ScrollView>
  );
}
