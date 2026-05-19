import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { DateInput } from "@/src/components/ui/DateInput";
import { IconButton } from "@/src/components/ui/IconButton";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { useToast } from "@/src/components/ui/Toast";
import { useInvoice } from "@/src/features/invoices/queries";
import { useCreateCreditNote } from "@/src/features/credit-notes/queries";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import { generateCreditNotePdf, shareCreditNotePdf } from "@/src/lib/pdf/generate-credit-note";
import { formatMoney } from "@/src/lib/money";
import type {
  CreditNoteLineItem,
  CurrencyCode,
} from "@/src/types/schemas";

type Line = {
  description: string;
  qty: string;
  unitPriceText: string;
  gstRate: number;
};

function dollarsToCents(text: string): number {
  if (!text) return 0;
  const num = Number(text);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function centsToDollars(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function enrichCnLine(line: Line, currency: CurrencyCode): CreditNoteLineItem {
  // Credit notes invert sign on save: positive qty → negative refund. We
  // multiply by -1 in the output so totals come out non-positive.
  const grossSubtotal = Math.round(Number(line.qty || "0") * dollarsToCents(line.unitPriceText));
  const gst = Math.round(grossSubtotal * line.gstRate);
  const sign = -1;
  return {
    description: line.description,
    qty: -Math.abs(Number(line.qty || "0")),
    unitPriceCents: dollarsToCents(line.unitPriceText),
    gstRate: line.gstRate,
    taxableCents: sign * grossSubtotal,
    gstAmountCents: sign * gst,
    lineTotalCents: sign * (grossSubtotal + gst),
  };
}

type Props = {
  invoiceId: string;
};

export function CreditNoteEditor({ invoiceId }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const invoiceQuery = useInvoice(invoiceId);
  const profile = useProfile();
  const settings = useSettings();
  const create = useCreateCreditNote();

  const [issueDate, setIssueDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-populate from the original invoice once loaded.
  useEffect(() => {
    const inv = invoiceQuery.data;
    if (!inv || lines.length > 0) return;
    setLines(
      inv.lineItems.map((l) => ({
        description: l.description,
        qty: String(l.qty),
        unitPriceText: centsToDollars(l.unitPriceCents),
        gstRate: l.gstRate,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceQuery.data]);

  const inv = invoiceQuery.data;
  const currency: CurrencyCode = inv?.currency ?? "AUD";

  const enrichedLines = useMemo(
    () => lines.map((l) => enrichCnLine(l, currency)),
    [lines, currency],
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    let total = 0;
    for (const l of enrichedLines) {
      subtotal += l.taxableCents;
      gst += l.gstAmountCents;
      total += l.lineTotalCents;
    }
    return { subtotalCents: subtotal, gstTotalCents: gst, totalCents: total };
  }, [enrichedLines]);

  function update(index: number, patch: Partial<Line>) {
    setLines((curr) => curr.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function remove(index: number) {
    setLines((curr) => curr.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!inv) return "Original invoice not found.";
    if (lines.length === 0) return "Add at least one refund line.";
    if (totals.totalCents >= 0) {
      return "Credit note total must be negative (a refund).";
    }
    return null;
  }

  async function handleIssue() {
    const error = validate();
    if (error) {
      if (Platform.OS === "web") toast.show({ message: error, variant: "error" });
      else Alert.alert("Can't issue", error);
      return;
    }
    if (!inv) return;
    setSubmitting(true);
    try {
      const cn = await create.mutateAsync({
        originalInvoiceId: inv.id,
        originalInvoiceNumber: inv.number,
        currency: inv.currency,
        clientSnapshot: inv.clientSnapshot,
        issueDate,
        reason,
        lineItems: enrichedLines,
      });
      // Generate + share the CN PDF.
      const pdf = await generateCreditNotePdf({
        creditNote: cn,
        profile: profile.data ?? {
          businessName: "",
          abn: "",
          address: "",
          email: "",
          phone: "",
          gstRegistered: true,
        },
        settings: settings.data ?? {
          numbering: { mode: "auto", prefix: "INV-", minDigits: 4, counter: 0 },
          lineItemMode: "basic",
          defaultGstRate: 0.1,
          defaultPaymentTermsDays: 14,
          defaultCurrency: "AUD",
          paymentDetails: {},
          emailDefaults: { subject: "", body: "" },
          themeMode: "system",
          biometricEnabled: false,
        },
      });
      await shareCreditNotePdf(pdf.uri, `${cn.number}.pdf`);
      toast.show({ message: `${cn.number} issued.`, variant: "success" });
      router.replace(`/invoices/${inv.id}`);
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't issue.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (invoiceQuery.isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-body text-muted">Loading…</Text>
      </View>
    );
  }
  if (!inv) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">Invoice not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={X}
            accessibilityLabel="Close"
            onPress={() => router.back()}
          />
          <View>
            <Text className="text-h2 text-foreground">New credit note</Text>
            <Text className="text-caption text-muted">
              Against {inv.number}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
      >
        <Card>
          <Text className="text-h2 text-foreground">Original invoice</Text>
          <Text className="mt-1 text-body text-foreground">
            {inv.number} · {inv.clientSnapshot.name}
          </Text>
          <Text className="mt-1 text-caption text-muted">
            Total {formatMoney(inv.totalCents, inv.currency)} · Paid{" "}
            {formatMoney(inv.amountPaidCents, inv.currency)}
          </Text>
        </Card>

        <DateInput label="Issue date" required value={issueDate} onChange={setIssueDate} />

        <Card>
          <Text className="text-h2 text-foreground">Refund lines</Text>
          <Text className="mt-1 text-caption text-muted">
            Reduce qty or amount per line. Totals are stored as negative values.
          </Text>
          <View className="mt-3 gap-3">
            {lines.map((line, index) => (
              <View
                key={index}
                className="gap-3 rounded-card border border-border bg-background p-3"
              >
                <View className="flex-row items-start gap-2">
                  <View className="flex-1">
                    <Input
                      label="Description"
                      value={line.description}
                      onChangeText={(v) => update(index, { description: v })}
                    />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <NumberInput
                      label="Qty"
                      value={line.qty}
                      onChangeText={(v) => update(index, { qty: v })}
                    />
                  </View>
                  <View className="flex-[2]">
                    <CurrencyInput
                      label="Unit price"
                      value={line.unitPriceText}
                      onChangeText={(v) => update(index, { unitPriceText: v })}
                    />
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <Button
                    label="Remove line"
                    variant="ghost"
                    onPress={() => remove(index)}
                  />
                  <Text className="text-body font-semibold text-status-overdue [font-feature-settings:'tnum']">
                    {formatMoney(enrichedLines[index]?.lineTotalCents ?? 0, currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Input
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Why is this credit being issued?"
          multiline
        />

        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-label text-muted">Credit total</Text>
            <Text className="text-h1 font-semibold text-status-overdue [font-feature-settings:'tnum']">
              {formatMoney(totals.totalCents, currency)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View
        className="border-t border-border bg-surface px-4 py-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row justify-end gap-2">
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button
            label={submitting ? "Issuing…" : "Issue credit note"}
            disabled={submitting}
            onPress={handleIssue}
          />
        </View>
      </View>
    </View>
  );
}
