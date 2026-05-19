import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { format } from "date-fns";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { DateInput } from "@/src/components/ui/DateInput";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { useToast } from "@/src/components/ui/Toast";
import { useRecordPayment } from "@/src/features/invoices/queries";
import type { Invoice } from "@/src/types/schemas";
import { formatMoney } from "@/src/lib/money";

type Props = {
  invoice: Invoice | null;
  onClose: () => void;
};

const METHODS = [
  { value: "Bank transfer", label: "Bank transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Other", label: "Other" },
];

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function dollarsToCents(text: string): number {
  if (!text) return 0;
  const num = Number(text);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function PaymentSheet({ invoice, onClose }: Props) {
  const recordPayment = useRecordPayment();
  const toast = useToast();
  const [date, setDate] = useState(todayIso());
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<string | null>("Bank transfer");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setDate(todayIso());
    setAmountText(centsToDollars(invoice.balanceCents));
    setMethod("Bank transfer");
    setNote("");
  }, [invoice]);

  if (!invoice) return null;

  async function submit() {
    if (!invoice) return;
    const amountCents = dollarsToCents(amountText);
    if (amountCents <= 0) {
      toast.show({ message: "Enter a positive amount.", variant: "error" });
      return;
    }
    if (amountCents > invoice.balanceCents) {
      toast.show({
        message: `Max remaining is ${formatMoney(invoice.balanceCents, invoice.currency)}.`,
        variant: "error",
      });
      return;
    }
    try {
      await recordPayment.mutateAsync({
        id: invoice.id,
        payment: {
          date,
          amountCents,
          ...(method ? { method } : {}),
          ...(note ? { note } : {}),
        },
      });
      toast.show({ message: "Payment recorded.", variant: "success" });
      onClose();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't record.",
        variant: "error",
      });
    }
  }

  return (
    <Sheet visible={!!invoice} onClose={onClose} title="Record payment">
      <View className="gap-3">
        <Text className="text-caption text-muted">
          Outstanding: {formatMoney(invoice.balanceCents, invoice.currency)}
        </Text>
        <DateInput label="Payment date" required value={date} onChange={setDate} />
        <CurrencyInput
          label="Amount"
          required
          value={amountText}
          onChangeText={setAmountText}
        />
        <Select
          label="Method"
          value={method}
          onChange={setMethod}
          options={METHODS}
        />
        <Input
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Reference, payer, anything else"
          multiline
        />
        <View className="flex-row justify-end gap-2">
          <Button label="Cancel" variant="ghost" onPress={onClose} />
          <Button
            label={recordPayment.isPending ? "Saving…" : "Record"}
            disabled={recordPayment.isPending}
            onPress={submit}
          />
        </View>
      </View>
    </Sheet>
  );
}
