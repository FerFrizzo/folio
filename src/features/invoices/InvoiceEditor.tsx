import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "@/src/components/ui/Button";
import { CollapsibleCard } from "@/src/components/ui/CollapsibleCard";
import { IconButton } from "@/src/components/ui/IconButton";
import { Input } from "@/src/components/ui/Input";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
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
import { InvoicePreviewModal } from "@/src/features/invoices/InvoicePreviewModal";
import {
  useCheckNumberExists,
  useCreateDraft,
  useMarkSent,
  useSetDraftNumber,
  useUpdateDraft,
} from "@/src/features/invoices/queries";
import {
  useInvoiceCounter,
  useProfile,
  useSettings,
  useEntitlement,
} from "@/src/features/settings/queries";
import {
  displayInvoiceNumber,
  shouldPersistNumber,
  suggestNextInvoiceNumber,
} from "@/src/lib/numbering";
import { useSuccessButton } from "@/src/lib/useSuccessButton";
import { generateInvoicePdf, shareInvoicePdf } from "@/src/lib/pdf/generate";
import { completeManualSend } from "@/src/features/invoices/manualSend";
import { computeFromInputs, type LineInput } from "@/src/lib/invoice-totals";
import { invoiceFromEditorState } from "@/src/lib/invoice-preview";
import { draftBlocker, sendBlocker } from "@/src/lib/invoice-validation";
import { errorMessage } from "@/src/lib/zod-message";
import { formatMoney } from "@/src/lib/money";
import type {
  ClientSnapshot,
  CurrencyCode,
  Discount,
  Invoice,
  InvoiceDraftInput,
  PaymentDetails,
  Profile,
  Settings,
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

// Used only while profile/settings are still loading, so the preview and the
// sent PDF degrade the same way instead of each inventing its own defaults.
const EMPTY_PROFILE: Profile = {
  businessName: "",
  abn: "",
  address: "",
  email: "",
  phone: "",
  gstRegistered: true,
};

const EMPTY_SETTINGS: Settings = {
  numbering: { mode: "auto", prefix: "INV-", minDigits: 4, counter: 0, allowManualNumber: false },
  lineItemMode: "basic",
  defaultGstRate: 0,
  defaultPaymentTermsDays: 14,
  defaultCurrency: "AUD",
  paymentDetails: {},
  emailDefaults: { subject: "", body: "" },
  themeMode: "system",
  biometricEnabled: false,
};

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
  const setDraftNumber = useSetDraftNumber();
  const checkNumberExists = useCheckNumberExists();

  const isNew = !initial;
  const allowManualNumber = settings.data?.numbering.allowManualNumber ?? false;
  // Read the live allocation counter so the header can show the number this
  // invoice would actually be issued, instead of the "DRAFT" sentinel.
  const invoiceCounter = useInvoiceCounter();
  const suggestion =
    settings.data && invoiceCounter.data !== undefined
      ? suggestNextInvoiceNumber({
          prefix: settings.data.numbering.prefix,
          counter: invoiceCounter.data,
          minDigits: settings.data.numbering.minDigits,
        })
      : null;

  const [draftId, setDraftId] = useState<string | null>(initial?.id ?? null);
  const [number, setNumber] = useState<string>(initial?.number ?? "DRAFT");
  // Tracks whether the user hand-edited the number, so autosave/create don't
  // clobber it with the "DRAFT" placeholder and we know to persist it.
  const numberEditedRef = useRef(false);
  // Set when a Save & Send is paused on a duplicate-number confirmation.
  const [pendingSendId, setPendingSendId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(
    initial?.currency ?? "AUD",
  );
  const [clientId, setClientId] = useState<string | null>(initial?.clientId ?? null);
  const [clientSnapshot, setClientSnapshot] = useState<ClientSnapshot>(
    initial?.clientSnapshot ?? { name: "" },
  );
  const [issueDate] = useState<string>(initial?.issueDate ?? todayIso());
  const [items, setItems] = useState<LineItemInput[]>(
    initial ? lineInputsFrom(initial) : [
      {
        description: "",
        qty: "1",
        unitPriceText: "",
        gstRate: settings.data?.defaultGstRate ?? 0,
      },
    ],
  );
  const [invoiceDiscount, setInvoiceDiscount] = useState<Discount | undefined>(
    initial?.invoiceDiscount,
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const { succeeded: sendSucceeded, triggerSuccess: triggerSendSuccess } = useSuccessButton();

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

  // Apply the user's default GST rate to a brand-new invoice's pristine first
  // line once settings load. Only touches a single untouched empty line so a
  // user's chosen tax is never overwritten. Export mode (handled above) wins.
  useEffect(() => {
    if (!isNew || !settings.data || exportMode) return;
    const rate = settings.data.defaultGstRate;
    setItems((curr) => {
      const only = curr[0];
      if (curr.length !== 1 || !only) return curr;
      if (only.description.trim() || only.unitPriceText.trim()) return curr;
      if (only.gstRate === rate) return curr;
      return [{ ...only, gstRate: rate }];
    });
  }, [isNew, settings.data, exportMode]);

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
  }, [draftId, currency, clientId, clientSnapshot, issueDate, items, invoiceDiscount, notes]);

  function buildDraftInput(): InvoiceDraftInput {
    return {
      clientId,
      clientSnapshot,
      issueDate,
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
      // Don't stomp a number the user is typing with the "DRAFT" placeholder.
      if (!numberEditedRef.current) setNumber(created.number);
      setSavingState("saved");
      return created.id;
    } catch (err) {
      setSavingState("idle");
      throw err;
    }
  }

  function onChangeNumber(v: string) {
    numberEditedRef.current = true;
    setNumber(v);
  }

  // Persist a hand-typed number onto the draft so markSent keeps it. Skipped
  // when the value is just the suggestion the user accepted — see
  // shouldPersistNumber: anything written here makes markSent take its manual
  // branch and skip the atomic claim.
  async function persistManualNumberIfNeeded(id: string) {
    if (
      !shouldPersistNumber({
        allowManualNumber,
        edited: numberEditedRef.current,
        typed: number,
        suggestion,
      })
    ) {
      return;
    }
    await setDraftNumber.mutateAsync({ id, number });
  }

  // One mapping from editor state to an Invoice, shared by Save & Send and the
  // preview, so what the user previews is what actually gets rendered on send.
  function buildInvoice(args: {
    id: string;
    number: string;
    status: Invoice["status"];
    now: string;
    sentAt?: string;
  }): Invoice {
    return invoiceFromEditorState({
      id: args.id,
      number: args.number,
      status: args.status,
      currency,
      clientId,
      clientSnapshot,
      issueDate,
      lineItems: computed.lines,
      invoiceDiscount,
      totals: computed.totals,
      notes,
      paymentInstructionsSnapshot: (settings.data?.paymentDetails ?? {}) as PaymentDetails,
      createdAt: initial?.createdAt ?? args.now,
      updatedAt: args.now,
      ...(args.sentAt ? { sentAt: args.sentAt } : {}),
    });
  }

  function validate(): string | null {
    return sendBlocker({
      clientSnapshot,
      lineCount: items.length,
      issueDate,
      totalCents: computed.totals.totalCents,
      discountTotalCents: computed.totals.discountTotalCents,
      grossSubtotalCents: computed.totals.grossSubtotalCents,
    });
  }

  function showBlocker(title: string, message: string) {
    if (Platform.OS === "web") {
      toast.show({ message, variant: "error" });
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleSaveDraft() {
    // Check before persisting: the draft's client name is NON_EMPTY in the
    // schema, so saving without one used to reach Firestore and come back as a
    // raw ZodError.
    const blocked = draftBlocker({ clientSnapshot });
    if (blocked) {
      showBlocker("Can't save yet", blocked);
      return;
    }
    setSubmitting(true);
    try {
      const id = await persistDraft();
      await persistManualNumberIfNeeded(id);
      router.replace(`/invoices/${id}`);
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Save failed."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAndSend() {
    const error = validate();
    if (error) {
      showBlocker("Can't send yet", error);
      return;
    }
    setSubmitting(true);
    try {
      const id = await persistDraft();
      await persistManualNumberIfNeeded(id);
      // Warn (don't block) if a manual number clashes with another invoice.
      const manual = number.trim();
      if (
        allowManualNumber &&
        numberEditedRef.current &&
        manual !== "" &&
        manual !== "DRAFT" &&
        (await checkNumberExists(manual, id))
      ) {
        setSubmitting(false);
        setPendingSendId(id);
        return;
      }
      await doSend(id);
    } catch (err) {
      setSubmitting(false);
      toast.show({
        message: errorMessage(err, "Couldn't send."),
        variant: "error",
      });
    }
  }

  async function doSend(id: string) {
    setSubmitting(true);
    try {
      const { number: claimed } = await markSent.mutateAsync({ id });
      setNumber(claimed);
      const now = new Date().toISOString();
      // Spread `initial` first so fields the editor doesn't own (pdfUrl, paidAt)
      // survive; the built object supplies everything the editor does own.
      const sentInvoice: Invoice = {
        ...(initial ?? ({} as Invoice)),
        ...buildInvoice({ id, number: claimed, status: "sent", now, sentAt: now }),
      };
      const pdf = await generateInvoicePdf({
        invoice: sentInvoice,
        isPro,
        profile: profile.data ?? EMPTY_PROFILE,
        settings: settings.data ?? EMPTY_SETTINGS,
      });
      await completeManualSend({
        share: () => shareInvoicePdf(pdf.uri, `${claimed}.pdf`),
        onShared: () => {
          triggerSendSuccess();
          router.replace(`/invoices/${id}`);
        },
      });
    } catch (err) {
      toast.show({
        message: errorMessage(err, "Couldn't send."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const shownNumber = displayInvoiceNumber({
    stored: number,
    edited: numberEditedRef.current,
    typed: number,
    suggestion,
  });

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
          <View className={allowManualNumber ? "w-44" : undefined}>
            {allowManualNumber ? (
              <Input
                value={shownNumber}
                onChangeText={onChangeNumber}
                placeholder="DRAFT"
                autoCapitalize="characters"
                accessibilityLabel="Invoice number"
              />
            ) : (
              <Text className="text-h2 text-foreground">{shownNumber}</Text>
            )}
            {savingState !== "idle" ? (
              <Text className="text-caption text-muted">
                {savingState === "saving" ? "Saving…" : "Saved"}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setPreviewOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Preview invoice"
            className="rounded-chip border border-border bg-surface px-3 py-1 active:bg-background"
          >
            <Text className="text-label font-semibold text-foreground">Preview</Text>
          </Pressable>
          <StatusBadge status="draft" />
        </View>
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
            defaultGstRate={settings.data?.defaultGstRate ?? 0}
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
              label={sendSucceeded ? "✓ Sent" : submitting ? "Marking…" : "Save & send"}
              variant={sendSucceeded ? "success" : "primary"}
              disabled={submitting || sendSucceeded}
              onPress={handleSaveAndSend}
            />
          </View>
        </View>
      </View>

      {/* Built only while open — otherwise every keystroke in the editor would
          re-assemble the invoice and re-render the template for nothing. */}
      {previewOpen ? (
        <InvoicePreviewModal
          visible
          onClose={() => setPreviewOpen(false)}
          invoice={buildInvoice({
            id: draftId ?? "preview",
            number: shownNumber || "DRAFT",
            status: "draft",
            now: new Date().toISOString(),
          })}
          profile={profile.data ?? EMPTY_PROFILE}
          settings={settings.data ?? EMPTY_SETTINGS}
          isPro={isPro}
        />
      ) : null}

      <ConfirmDialog
        visible={pendingSendId !== null}
        title="Number already used"
        description={`${number} is already used by another invoice. Send with this number anyway?`}
        confirmLabel="Send anyway"
        onCancel={() => setPendingSendId(null)}
        onConfirm={() => {
          const id = pendingSendId;
          setPendingSendId(null);
          if (id) void doSend(id);
        }}
      />
    </View>
  );
}

export function NewInvoiceEditor() {
  return <InvoiceEditor />;
}
