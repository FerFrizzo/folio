import { Text, View } from "react-native";
import { Link } from "expo-router";
import type { PaymentDetails } from "@/src/types/schemas";

type Props = {
  details: PaymentDetails;
};

// Phase 2: payment details are read from settings (snapshotted onto the
// invoice at save time). Editing is on the Settings screen — this section is
// purely a preview of what will be embedded on the invoice/PDF.
export function PaymentSection({ details }: Props) {
  const rows: { label: string; value: string }[] = [];
  if (details.bsb) rows.push({ label: "BSB", value: details.bsb });
  if (details.accNumber) rows.push({ label: "Account", value: details.accNumber });
  if (details.accName) rows.push({ label: "Name", value: details.accName });
  if (details.payId) rows.push({ label: "PayID", value: details.payId });
  if (details.otherNotes) rows.push({ label: "Other", value: details.otherNotes });

  return (
    <View className="gap-2">
      {rows.length === 0 ? (
        <View className="gap-2">
          <Text className="text-body text-muted">
            No payment details on file.
          </Text>
          <Link href="/settings" className="text-body font-semibold text-accent">
            Add payment details →
          </Link>
        </View>
      ) : (
        rows.map((r) => (
          <View key={r.label} className="flex-row gap-3">
            <Text className="w-20 text-label text-muted">{r.label}</Text>
            <Text className="flex-1 text-body text-foreground">{r.value}</Text>
          </View>
        ))
      )}
      <Text className="mt-2 text-caption text-muted">
        Snapshotted onto the invoice on save — later edits to settings won&apos;t
        change historical invoices.
      </Text>
    </View>
  );
}
