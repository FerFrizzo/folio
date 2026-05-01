import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import { useRemovePayment } from "@/src/features/invoices/queries";
import type { Invoice } from "@/src/types/schemas";

type Props = {
  invoice: Invoice;
};

export function PaymentsLog({ invoice }: Props) {
  const toast = useToast();
  const removePayment = useRemovePayment();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  if (!invoice.payments.length) {
    return (
      <Card>
        <Text className="text-h2 text-foreground">Payments</Text>
        <Text className="mt-1 text-caption text-muted">
          No payments recorded yet.
        </Text>
      </Card>
    );
  }

  async function performRemove() {
    const idx = pendingIndex;
    setPendingIndex(null);
    if (idx === null) return;
    try {
      await removePayment.mutateAsync({ id: invoice.id, index: idx });
      toast.show({ message: "Payment removed.", variant: "info" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't remove.",
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Payments</Text>
      <View className="mt-3 gap-2">
        {invoice.payments.map((p, i) => (
          <View
            key={`${p.date}-${i}`}
            className="flex-row items-center justify-between border-b border-border py-2 last:border-b-0"
          >
            <View className="flex-1">
              <Text className="text-body text-foreground">
                {formatMoney(p.amountCents, invoice.currency)}
              </Text>
              <Text className="text-caption text-muted">
                {p.date} · {p.method ?? "—"}
                {p.note ? ` · ${p.note}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => setPendingIndex(i)}
              accessibilityRole="button"
              accessibilityLabel="Remove payment"
              hitSlop={8}
            >
              <Trash2 size={16} color="#C0392B" />
            </Pressable>
          </View>
        ))}
      </View>

      <ConfirmDialog
        visible={pendingIndex !== null}
        title="Remove this payment?"
        description="This may flip the invoice back to Partial or Sent."
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingIndex(null)}
        onConfirm={performRemove}
      />
    </Card>
  );
}
