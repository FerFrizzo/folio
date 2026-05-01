import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useInvoice } from "@/src/features/invoices/queries";
import { InvoiceEditor } from "@/src/features/invoices/InvoiceEditor";
import { InvoiceDetail } from "@/src/features/invoices/InvoiceDetail";

// Single route handles both: drafts open the editor, sent+ open the detail
// view (immutable per spec §6).
export default function InvoiceRoute() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceQuery = useInvoice(id);

  if (invoiceQuery.isLoading) {
    return (
      <View
        className="flex-1 bg-background px-4 pt-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Skeleton height={32} />
        <View className="mt-4 gap-2">
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      </View>
    );
  }

  if (!invoiceQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">Invoice not found.</Text>
      </View>
    );
  }

  const invoice = invoiceQuery.data;
  if (invoice.status === "draft") {
    return <InvoiceEditor initial={invoice} />;
  }
  return <InvoiceDetail invoice={invoice} />;
}
