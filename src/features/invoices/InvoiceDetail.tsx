import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Pencil, Share2 } from "lucide-react-native";
import WebView from "react-native-webview";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { IconButton } from "@/src/components/ui/IconButton";
import { Input } from "@/src/components/ui/Input";
import { Sheet } from "@/src/components/ui/Sheet";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import { generateInvoicePdf, shareInvoicePdf } from "@/src/lib/pdf/generate";
import { deriveDisplayStatus } from "@/src/lib/invoice-status";
import {
  useArchiveInvoice,
  useCheckNumberExists,
  useCreateDraft,
  useRecordPayment,
  useUpdateInvoiceNumber,
} from "@/src/features/invoices/queries";
import { useCreditNotesForInvoice } from "@/src/features/credit-notes/queries";
import { useProfile, useSettings, useEntitlement } from "@/src/features/settings/queries";
import { PaymentSheet } from "@/src/features/invoices/PaymentSheet";
import { PaymentsLog } from "@/src/features/invoices/PaymentsLog";
import { SendEmailSheet } from "@/src/features/invoices/SendEmailSheet";
import type { Invoice } from "@/src/types/schemas";
import { errorMessage } from "@/src/lib/zod-message";

type Props = {
  invoice: Invoice;
};

export function InvoiceDetail({ invoice }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const profile = useProfile();
  const settings = useSettings();
  const isPro = useEntitlement() === "pro";
  const archive = useArchiveInvoice();
  const createDraft = useCreateDraft();
  const recordPayment = useRecordPayment();
  const updateInvoiceNumber = useUpdateInvoiceNumber();
  const checkNumberExists = useCheckNumberExists();
  const creditNotes = useCreditNotesForInvoice(invoice.id);
  const allowManualNumber = settings.data?.numbering.allowManualNumber ?? false;
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const PDF_HEIGHT = 520;
  const [sharing, setSharing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [editNumberOpen, setEditNumberOpen] = useState(false);
  const [numberDraft, setNumberDraft] = useState(invoice.number);
  const [confirmDupNumber, setConfirmDupNumber] = useState(false);
  const [savingNumber, setSavingNumber] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!profile.data && !settings.data) return;
    setGenerating(true);
    void (async () => {
      try {
        const result = await generateInvoicePdf({
          invoice,
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
            numbering: { mode: "auto", prefix: "INV-", minDigits: 4, counter: 0, allowManualNumber: false },
            lineItemMode: "basic",
            defaultGstRate: 0,
            defaultPaymentTermsDays: 14,
            defaultCurrency: "AUD",
            paymentDetails: {},
            emailDefaults: { subject: "", body: "" },
            themeMode: "system",
            biometricEnabled: false,
          },
        });
        if (cancelled) return;
        setPdfUri(result.uri);
        setPdfHtml(result.html);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.show({
            message: errorMessage(err, "PDF failed."),
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // toast is from context and stable across renders; excluded to avoid
    // re-running PDF generation on toast identity changes.
    // isPro triggers regeneration on upgrade/downgrade (lazy re-render per spec §4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, profile.data, settings.data, isPro]);

  const display = deriveDisplayStatus(invoice);

  async function share() {
    if (!pdfUri) return;
    setSharing(true);
    try {
      await shareInvoicePdf(pdfUri, `${invoice.number}.pdf`);
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't share."),
        variant: "error",
      });
    } finally {
      setSharing(false);
    }
  }

  async function duplicate() {
    try {
      const created = await createDraft.mutateAsync({
        clientId: invoice.clientId,
        clientSnapshot: invoice.clientSnapshot,
        currency: invoice.currency,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        notes: invoice.notes,
        paymentInstructionsSnapshot: invoice.paymentInstructionsSnapshot,
      });
      router.replace(`/invoices/${created.id}`);
      toast.show({ message: "Duplicated as draft.", variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't duplicate."),
        variant: "error",
      });
    }
  }

  async function performArchive() {
    setConfirmArchive(false);
    try {
      await archive.mutateAsync(invoice.id);
      toast.show({ message: `${invoice.number} archived.`, variant: "info" });
      router.back();
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't archive."),
        variant: "error",
      });
    }
  }

  async function markPaidNow() {
    if (invoice.balanceCents <= 0) return;
    try {
      await recordPayment.mutateAsync({
        id: invoice.id,
        payment: {
          date: new Date().toISOString().slice(0, 10),
          amountCents: invoice.balanceCents,
          method: "Manual",
        },
      });
      toast.show({ message: `${invoice.number} marked paid.`, variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't mark paid."),
        variant: "error",
      });
    }
  }

  function issueCreditNote() {
    router.push({
      pathname: "/credit-notes/new",
      params: { invoiceId: invoice.id },
    });
  }

  function openEditNumber() {
    setNumberDraft(invoice.number);
    setEditNumberOpen(true);
  }

  // Save from the edit-number sheet: warn (not block) on a duplicate, then
  // commit. Committing keeps the auto counter ahead of the new number.
  async function saveNumber() {
    const trimmed = numberDraft.trim();
    if (trimmed === "" || trimmed === invoice.number) {
      setEditNumberOpen(false);
      return;
    }
    if (await checkNumberExists(trimmed, invoice.id)) {
      setConfirmDupNumber(true);
      return;
    }
    await commitNumber(trimmed);
  }

  async function commitNumber(next: string) {
    setSavingNumber(true);
    try {
      await updateInvoiceNumber.mutateAsync({ id: invoice.id, number: next });
      setConfirmDupNumber(false);
      setEditNumberOpen(false);
      toast.show({ message: `Number changed to ${next}.`, variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't update number."),
        variant: "error",
      });
    } finally {
      setSavingNumber(false);
    }
  }

  // Linked credit note totals → "Net balance" per spec §7.
  const cnList = creditNotes.data ?? [];
  const cnTotalCents = cnList.reduce((sum, c) => sum + c.totalCents, 0);
  const netBalanceCents = invoice.totalCents + cnTotalCents - invoice.amountPaidCents;

  return (
    <View className="flex-1 bg-background">
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View>
            <View className="flex-row items-center gap-1">
              <Text className="text-h2 text-foreground">{invoice.number}</Text>
              {allowManualNumber ? (
                <IconButton
                  icon={Pencil}
                  accessibilityLabel="Edit invoice number"
                  onPress={openEditNumber}
                />
              ) : null}
            </View>
            <Text className="text-caption text-muted">
              {invoice.clientSnapshot.name}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <StatusBadge status={display} />
          </View>
          <IconButton
            icon={Share2}
            accessibilityLabel="Share PDF"
            onPress={share}
            disabled={!pdfUri || sharing || generating}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        <Card className="p-0 overflow-hidden">
          <View style={{ height: PDF_HEIGHT }}>
            {generating ? (
              <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color="#1473FF" />
                <Text className="mt-2 text-caption text-muted">
                  Generating PDF…
                </Text>
              </View>
            ) : Platform.OS === "web" ? (
              pdfHtml ? (
                <iframe
                  srcDoc={pdfHtml}
                  style={{ width: "100%", height: PDF_HEIGHT, border: 0 }}
                  title={`${invoice.number} preview`}
                />
              ) : null
            ) : pdfHtml ? (
              <WebView
                source={{ html: pdfHtml }}
                style={{ flex: 1 }}
                scrollEnabled
              />
            ) : null}
          </View>
        </Card>

        <Card>
          <Text className="text-label text-muted">Total</Text>
          <Text className="mt-1 text-display font-bold text-foreground [font-feature-settings:'tnum']">
            {formatMoney(invoice.totalCents, invoice.currency)}
          </Text>
          <Text className="mt-1 text-caption text-muted">
            Subtotal {formatMoney(invoice.subtotalCents, invoice.currency)} ·
            GST {formatMoney(invoice.gstTotalCents, invoice.currency)}
          </Text>
          {invoice.amountPaidCents > 0 ? (
            <Text className="mt-1 text-caption text-muted">
              Paid {formatMoney(invoice.amountPaidCents, invoice.currency)} ·
              Outstanding {formatMoney(invoice.balanceCents, invoice.currency)}
            </Text>
          ) : null}
          {cnList.length > 0 ? (
            <View className="mt-3 border-t border-border pt-3">
              <Text className="text-caption text-muted">
                Credit notes ({cnList.length}):{" "}
                {formatMoney(cnTotalCents, invoice.currency)}
              </Text>
              <Text className="mt-1 text-body font-semibold text-foreground [font-feature-settings:'tnum']">
                Net balance: {formatMoney(netBalanceCents, invoice.currency)}
              </Text>
            </View>
          ) : null}
        </Card>

        {invoice.status !== "draft" ? <PaymentsLog invoice={invoice} /> : null}

        <View className="gap-2">
          <Button
            label="Send email"
            onPress={() => {
              if (!isPro) {
                router.push("/paywall");
                return;
              }
              setEmailInvoice(invoice);
            }}
          />
          {invoice.status !== "draft" && invoice.balanceCents > 0 ? (
            <>
              <Button label="Mark paid" variant="secondary" onPress={markPaidNow} />
              <Button
                label="Record payment"
                variant="secondary"
                onPress={() => setPaymentInvoice(invoice)}
              />
            </>
          ) : null}
          <Button
            label={sharing ? "Sharing…" : "Share PDF"}
            variant="ghost"
            disabled={!pdfUri || sharing}
            onPress={share}
          />
          {!isPro ? (
            <Button
              label="Download without watermark"
              variant="ghost"
              onPress={() => router.push("/paywall")}
            />
          ) : null}
          {invoice.status !== "draft" ? (
            <Button
              label="Issue credit note"
              variant="secondary"
              onPress={issueCreditNote}
            />
          ) : null}
          <Button label="Duplicate as draft" variant="ghost" onPress={duplicate} />
          {invoice.status !== "draft" ? (
            <Button
              label="Archive"
              variant="ghost"
              onPress={() => setConfirmArchive(true)}
            />
          ) : null}
        </View>
      </ScrollView>

      <PaymentSheet
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
      />

      <SendEmailSheet
        invoice={emailInvoice}
        onClose={() => setEmailInvoice(null)}
      />

      <ConfirmDialog
        visible={confirmArchive}
        title={`Archive ${invoice.number}?`}
        description="Archived invoices are hidden from the main list but kept on file for ATO retention."
        confirmLabel="Archive"
        destructive
        onCancel={() => setConfirmArchive(false)}
        onConfirm={performArchive}
      />

      <Sheet
        visible={editNumberOpen}
        onClose={() => setEditNumberOpen(false)}
        title="Edit invoice number"
      >
        <View className="gap-3">
          <View className="rounded-card border border-amber-300 bg-amber-50 p-3">
            <Text className="text-caption text-amber-800">
              This invoice has already been sent. Changing its number won&apos;t
              update any PDF or email you&apos;ve already shared, and could clash
              with another invoice&apos;s number. Only do this to correct a
              mistake.
            </Text>
          </View>
          <Input
            label="Invoice number"
            value={numberDraft}
            onChangeText={setNumberDraft}
            autoCapitalize="characters"
            accessibilityLabel="Invoice number"
          />
          <Button
            label={savingNumber ? "Saving…" : "Save number"}
            disabled={savingNumber || numberDraft.trim() === ""}
            onPress={saveNumber}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmDupNumber}
        title="Number already used"
        description={`${numberDraft.trim()} is already used by another invoice. Use it anyway?`}
        confirmLabel="Use anyway"
        onCancel={() => setConfirmDupNumber(false)}
        onConfirm={() => commitNumber(numberDraft.trim())}
      />
    </View>
  );
}
