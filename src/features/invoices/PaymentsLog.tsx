import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import { useRemovePayment, useUpdatePayment } from "@/src/features/invoices/queries";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { DateInput } from "@/src/components/ui/DateInput";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import type { Invoice, PaymentRecord } from "@/src/types/schemas";
import { parseOptionalPaymentDate } from "@/src/lib/payment-date";
import { errorMessage } from "@/src/lib/zod-message";

type Props = {
  invoice: Invoice;
};

const METHODS = [
  { value: "Bank transfer", label: "Bank transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Other", label: "Other" },
  { value: "Manual", label: "Manual" },
];

function dollarsToCents(text: string): number {
  if (!text) return 0;
  const num = Number(text);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function paymentCaption(payment: PaymentRecord): string {
  const parts: string[] = [];
  if (payment.date) parts.push(format(parseISO(payment.date), "d MMM yyyy"));
  if (payment.method) parts.push(payment.method);
  if (payment.note) parts.push(payment.note);
  return parts.join(" · ");
}

export function PaymentsLog({ invoice }: Props) {
  const toast = useToast();
  const removePayment = useRemovePayment();
  const updatePayment = useUpdatePayment();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!invoice.payments.length && editingIndex === null) {
    return (
      <Card>
        <Text className="text-h2 text-foreground">Payments</Text>
        <Text className="mt-1 text-caption text-muted">
          No payments recorded yet.
        </Text>
      </Card>
    );
  }

  function openEdit(index: number, payment: PaymentRecord) {
    setEditingIndex(index);
    setDate(payment.date ?? "");
    setAmountText(centsToDollars(payment.amountCents));
    setMethod(payment.method ?? null);
    setNote(payment.note ?? "");
  }

  async function performRemove() {
    const idx = pendingIndex;
    setPendingIndex(null);
    if (idx === null) return;
    try {
      await removePayment.mutateAsync({ id: invoice.id, index: idx });
      toast.show({ message: "Payment removed.", variant: "info" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't remove."),
        variant: "error",
      });
    }
  }

  async function saveEdit() {
    if (editingIndex === null) return;
    const amountCents = dollarsToCents(amountText);
    const parsedDate = parseOptionalPaymentDate(date);
    if (!parsedDate.ok) {
      toast.show({ message: "Use a date as YYYY-MM-DD.", variant: "error" });
      return;
    }
    const others = invoice.payments.reduce(
      (sum, p, i) => (i === editingIndex ? sum : sum + p.amountCents),
      0,
    );
    if (others + amountCents > invoice.totalCents) {
      toast.show({
        message: `Max for this payment is ${formatMoney(invoice.totalCents - others, invoice.currency)}.`,
        variant: "error",
      });
      return;
    }
    try {
      await updatePayment.mutateAsync({
        id: invoice.id,
        index: editingIndex,
        payment: {
          ...(parsedDate.date ? { date: parsedDate.date } : {}),
          amountCents,
          ...(method ? { method } : {}),
          ...(note ? { note } : {}),
        },
      });
      setEditingIndex(null);
      toast.show({ message: "Payment updated.", variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't update."),
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Payments</Text>
      <View className="mt-3 gap-2">
        {invoice.payments.map((p, i) => {
          const caption = paymentCaption(p);
          return (
            <View
              key={`${p.date ?? "undated"}-${i}`}
              className="flex-row items-center justify-between border-b border-border py-2 last:border-b-0"
            >
              <View className="flex-1">
                <Text className="text-body text-foreground">
                  {formatMoney(p.amountCents, invoice.currency)}
                </Text>
                {caption ? (
                  <Text className="text-caption text-muted">{caption}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => openEdit(i, p)}
                accessibilityRole="button"
                accessibilityLabel="Edit payment"
                hitSlop={8}
                className="mr-3"
              >
                <Pencil size={16} color="#1473FF" />
              </Pressable>
              <Pressable
                onPress={() => setPendingIndex(i)}
                accessibilityRole="button"
                accessibilityLabel="Remove payment"
                hitSlop={8}
              >
                <Trash2 size={16} color="#C0392B" />
              </Pressable>
            </View>
          );
        })}
      </View>

      <ConfirmDialog
        visible={pendingIndex !== null}
        title="Remove this payment?"
        description="The invoice stays. Paid amount, balance and status are recalculated."
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingIndex(null)}
        onConfirm={performRemove}
      />

      <Sheet
        visible={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title="Edit payment"
      >
        <View className="gap-3">
          <DateInput label="Payment date" value={date} onChange={setDate} />
          <CurrencyInput
            label="Amount"
            required
            value={amountText}
            onChangeText={setAmountText}
          />
          <Select label="Method" value={method} onChange={setMethod} options={METHODS} />
          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Reference, payer, anything else"
            multiline
          />
          <View className="flex-row justify-end gap-2">
            <Button label="Cancel" variant="ghost" onPress={() => setEditingIndex(null)} />
            <Button
              label={updatePayment.isPending ? "Saving…" : "Save payment"}
              disabled={updatePayment.isPending}
              onPress={saveEdit}
            />
          </View>
        </View>
      </Sheet>
    </Card>
  );
}
