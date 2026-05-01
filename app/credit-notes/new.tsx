import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CreditNoteEditor } from "@/src/features/credit-notes/CreditNoteEditor";

export default function NewCreditNoteScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  if (!invoiceId) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">No invoice specified.</Text>
      </View>
    );
  }
  return <CreditNoteEditor invoiceId={invoiceId} />;
}
