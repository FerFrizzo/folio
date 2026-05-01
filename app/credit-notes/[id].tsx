import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useCreditNote } from "@/src/features/credit-notes/queries";
import { CreditNoteDetail } from "@/src/features/credit-notes/CreditNoteDetail";

export default function CreditNoteRoute() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cnQuery = useCreditNote(id);

  if (cnQuery.isLoading) {
    return (
      <View
        className="flex-1 bg-background px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Skeleton height={32} />
        <View className="mt-4 gap-2">
          <Skeleton height={120} />
        </View>
      </View>
    );
  }
  if (!cnQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">Credit note not found.</Text>
      </View>
    );
  }
  return <CreditNoteDetail creditNote={cnQuery.data} />;
}
