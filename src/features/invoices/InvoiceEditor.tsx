import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { addDays, format } from "date-fns";
import { Button } from "@/src/components/ui/Button";
import { CollapsibleCard } from "@/src/components/ui/CollapsibleCard";
import { DateInput } from "@/src/components/ui/DateInput";
import { IconButton } from "@/src/components/ui/IconButton";
import { Select } from "@/src/components/ui/Select";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useToast } from "@/src/components/ui/Toast";
import { ClientSection } from "@/src/features/invoices/sections/ClientSection";
import {
  ItemsSection,
  type LineItemInput,
} from "@/src/features/invoices/sections/ItemsSection";
import { PaymentSection } from "@/src/features/invoices/sections/PaymentSection";
import { NotesSection } from "@/src/features/invoices/sections/NotesSection";
import { InvoiceDiscountEditor } from "@/src/features/invoices/InvoiceDiscountEditor";
import {
  useCreateDraft,
  useMarkSent,
  useUpdateDraft,
} from "@/src/features/invoices/queries";
import { useProfile, useSettings, useEntitlement } from "@/src/features/settings/queries";
import { generateInvoicePdf, shareInvoicePdf } from "@/src/lib/pdf/generate";
import { computeFromInputs, type LineInput } from "@/src/lib/invoice-totals";
import { formatMoney } from "@/src/lib/money";
import type {
  ClientSnapshot,
  CurrencyCode,
  Discount,
  Invoice,
  InvoiceDraftInput,
  PaymentDetails,
} from "@/src/types/schemas";

type Props = {
  initial?: Invoice;
};

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "NZD", label: "NZD — New Zealand dollar" },
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

function lineInputsFrom(invoice: Invoice): LineItemInput[] {
  return invoice.lineItems.map((l) => ({
    description: l.description,
    qty: String(l.qty),
    unitPriceText: centsToDollars(l.unitPriceCents),
    gstRate: l.gstRate,
    ...(l.lineDiscount ? { lineDiscount: l.lineDiscount } : {}),
  }));
}

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultDueIso(termsDays: number): string {
  return format(addDays(new Date(), termsDays), "yyyy-MM-dd");
}

export function InvoiceEditor({ initial }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const profile = useProfile();
  const settings = useSettings();
  const isPro = useEntitlement() === "pro";
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const markSent = useMarkSent();

  const isNew = !initial;

  const [draftId, setDraftId] = useState<string | null>(initial?.id ?? null);
  const [number, setNumber] = useState<string>(initial?.number ?? "DRAFT");
  const [currency, setCurrency] = useState<CurrencyCode>(
    initial?.currency ?? "AUD",
  );
  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? null);
  const [clientSnapshot, setClientSnapshot] = useState<ClientSnapshot>(
    initial?.clientSnapshot ?? { name: "" },
  );
  const [issueDate, setIssueDate] = useState<string>(initial?.issueDate ?? todayIso());
  const [dueDate, setDueDate] = useState<string>(
    initial?.dueDate ??
      defaultDueIso(settings.data?.defaultPaymentTermsDays ?? 14),
  );
  const [items, setItems] = useState<LineItemInput[]>(
    initial ? lineInputsFrom(initial) : [
      { description: "", qty: "1", unitPriceText: "", gstRate: 0.1 },
    ],
  );
  const [invoiceDiscount, setInvoiceDiscount] = useState<Discount | undefined>(
    initial?.invoiceDiscount,
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);

  const exportMode = currency !== "AUD";
  // Switching currency mid-edit is locked once any non-empty line exists. The
  // user is steered to clear lines first to avoid implicit conversions.
  const currencyLocked = items.some(
    (it) => it.description.trim() || it.unitPriceText.trim(),
  );

  // Force GST=0 on every line when in export mode (non-AUD).
  useEffect(() => {
    if (!exportMode) return;
    setItems((curr) => {
      let changed = false;
      const next = curr.map((it) => {
        if (it.gstRate !== 0) {
          changed = true;
          return { ...it, gstRate: 0 };
        }
        return it;
      });
      return changed ? next : curr;
    });
  }, [exportMode]);

  useEffect(() => {
    if (!isNew || !settings.data) return;
    setDueDate((d) =>
      d === "" || !d ? defaultDueIso(settings.data.defaultPaymentTermsDays) : d,
    );
  }, [isNew, settings.data]);

  const lineInputs: LineInput[] = useMemo(
    () =>
      items.map((it) => ({
        description: it.description,
        qty: Number(it.qty) || 0,
        unitPriceCents: dollarsToCents(it.unitPriceText),
        gstRate: it.gstRate,
        ...(it.lineDiscount ? { lineDiscount: it.lineDiscount } : {}),
      })),
    [items],
  );
  const computed = useMemo(
    () => computeFromInputs(lineInputs, invoiceDiscount),
    [lineInputs, invoiceDiscount],
  );

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string>("");
  useEffect(() => {
    if (!draftId) return;
    const serialized = JSON.stringify({
      currency,
      clientId,
      clientSnapshot,
      issueDate,
      dueDate,
      items,
      invoiceDiscount,
      notes,
    });
    if (serialized === lastSerializedRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      lastSerializedRef.current = serialized;
      void persistDraft(draftId);
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, currency, clientId, clientSnapshot, issueDate, dueDate, items, invoiceDiscount, notes]);

  function buildDraftInput(): InvoiceDraftInput {
    return {
      clientId,
      clientSnapshot,
      issueDate,
      dueDate,
      currency,
      lineItems: computed.lines,
      ...(invoiceDiscount ? { invoiceDiscount } : {}),
      notes,
      paymentInstructionsSnapshot: (settings.data?.paymentDetails ?? {}) as PaymentDetails,
    };
  }

  async function persistDraft(idOverride?: string): Promise<string> {
    const id = idOverride ?? draftId;
    setSavingState("saving");
    try {
      if (id) {
        await updateDraft.mutateAsync({ id, patch: buildDraftInput() });
        setSavingState("saved");
        return id;
      }
      const created = await createDraft.mutateAsync(buildDraftInput());
      setDraftId(created.id);
      setNumber(created.number);
      setSavingState("saved");
      return created.id;
    } catch (err) {
      setSavingState("idle");
      throw err;
    }
  }

  function validate(): string | null {
    if (!clientSnapshot.name) return "Pick a client first.";
    if (items.length === 0) return "Add at least one line item.";
    if (!issueDate || !dueDate) return "Issue and due dates are required.";
    if (computed.totals.totalCents <= 0) {
      return "Total must be greater than zero.";
    }
    if (computed.totals.discountTotalCents > computed.totals.grossSubtotalCents) {
      return "Total discount can't exceed the subtotal.";
    }
    return null;
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    try {
      const id = await persistDraft();
      toast.show({ message: "Draft saved.", variant: "success" });
      router.replace(`/invoices/${id}`);
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Save failed.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAndSend() {
    const error = validate();
    if (error) {
      if (Platform.OS === "web") {
        toast.show({ message: error, variant: "error" });
      } else {
        Alert.alert("Can't send yet", error);
      }
      return;
    }
    setSubmitting(true);
    try {
      const id = await persistDraft();
      const { number: claimed } = await markSent.mutateAsync({ id });
      const sentInvoice: Invoice = {
        ...(initial ?? ({} as Invoice)),
        id,
        number: claimed,
        status: "sent",
        currency,
        clientId,
        clientSnapshot,
        issueDate,
        dueDate,
        lineItems: computed.lines,
        ...(invoiceDiscount ? { invoiceDiscount } : {}),
        subtotalCents: computed.totals.subtotalCents,
        lineDiscountTotalCents: computed.totals.lineDiscountTotalCents,
        invoiceDiscountTotalCents: computed.totals.invoiceDiscountTotalCents,
        discountTotalCents: computed.totals.discountTotalCents,
        gstTotalCents: computed.totals.gstTotalCents,
        totalCents: computed.totals.totalCents,
        amountPaidCents: 0,
        balanceCents: computed.totals.totalCents,
        payments: [],
        notes,
        paymentInstructionsSnapshot: (settings.data?.paymentDetails ?? {}) as PaymentDetails,
        creditNoteIds: [],
        createdAt: initial?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      };
      const pdf = await generateInvoicePdf({
        invoice: sentInvoice,
        isPro,
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
      await shareInvoicePdf(pdf.uri, `${claimed}.pdf`);
      toast.show({ message: `${claimed} sent.`, variant: "success" });
      router.replace(`/invoices/${id}`);
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't send.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
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
            <Text className="text-h2 text-foreground">{number}</Text>
            <Text className="text-caption text-muted">
              {savingState === "saving"
                ? "Saving…"
                : savingState === "saved"
                  ? "Saved"
                  : ""}
            </Text>
          </View>
        </View>
        <StatusBadge status="draft" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}
      >
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Select
              label="Currency"
              value={currency}
              onChange={(v) => setCurrency(v)}
              options={CURRENCY_OPTIONS}
            />
            {currencyLocked ? (
              <Text className="mt-1 text-caption text-muted">
                Clear all lines to change currency.
              </Text>
            ) : null}
          </View>
        </View>
        {exportMode ? (
          <View className="rounded-card border border-amber-200 bg-amber-50 p-3">
            <Text className="text-caption text-amber-800">
              Non-AUD invoices are GST-free exports. GST won&apos;t be applied to
              any line on this invoice.
            </Text>
          </View>
        ) : null}

        <View className="gap-1">
          <Text className="text-caption text-muted">Dates</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DateInput
                label="Issue date"
                required
                value={issueDate}
                onChange={setIssueDate}
              />
            </View>
            <View className="flex-1">
              <DateInput
                label="Due date"
                required
                value={dueDate}
                onChange={setDueDate}
              />
            </View>
          </View>
        </View>

        <CollapsibleCard title="Client" defaultExpanded={isNew || !clientId}>
          <ClientSection
            clientId={clientId}
            snapshot={clientSnapshot}
            onChange={(id, snap) => {
              setClientId(id);
              setClientSnapshot(snap);
            }}
          />
        </CollapsibleCard>

        <CollapsibleCard title="Items" defaultExpanded={isNew || items.length === 0}>
          <ItemsSection
            items={items}
            onChange={setItems}
            currency={currency}
            exportMode={exportMode}
            computedLineTotalsCents={computed.lines.map((l) => l.lineTotalCents)}
          />
        </CollapsibleCard>

        <CollapsibleCard title="Discount">
          <InvoiceDiscountEditor
            currency={currency}
            value={invoiceDiscount}
            onChange={setInvoiceDiscount}
          />
          {computed.totals.invoiceDiscountTotalCents > 0 ? (
            <Text className="mt-2 text-caption text-muted">
              Reduces subtotal by{" "}
              {formatMoney(computed.totals.invoiceDiscountTotalCents, currency)}.
            </Text>
          ) : null}
        </CollapsibleCard>

        <CollapsibleCard title="Payment" defaultExpanded={isNew}>
          <PaymentSection details={settings.data?.paymentDetails ?? {}} />
        </CollapsibleCard>

        <CollapsibleCard title="Notes" defaultExpanded={isNew}>
          <NotesSection value={notes} onChange={setNotes} />
        </CollapsibleCard>
      </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-t border-border bg-surface px-4 py-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View>
            <Text className="text-caption text-muted">Total</Text>
            <Text className="text-h1 font-semibold text-foreground [font-feature-settings:'tnum']">
              {formatMoney(computed.totals.totalCents, currency)}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Button
              label="Save draft"
              variant="secondary"
              disabled={submitting}
              onPress={handleSaveDraft}
            />
            <Button
              label="Save & send"
              disabled={submitting}
              onPress={handleSaveAndSend}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export function NewInvoiceEditor() {
  return <InvoiceEditor />;
}
