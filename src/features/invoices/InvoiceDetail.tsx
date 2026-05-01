import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import WebView from "react-native-webview";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { IconButton } from "@/src/components/ui/IconButton";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import { generateInvoicePdf, shareInvoicePdf } from "@/src/lib/pdf/generate";
import { deriveDisplayStatus } from "@/src/lib/invoice-status";
import {
  useArchiveInvoice,
  useCreateDraft,
} from "@/src/features/invoices/queries";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import type { Invoice } from "@/src/types/schemas";

type Props = {
  invoice: Invoice;
};

export function InvoiceDetail({ invoice }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const profile = useProfile();
  const settings = useSettings();
  const archive = useArchiveInvoice();
  const createDraft = useCreateDraft();
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!profile.data && !settings.data) return;
    setGenerating(true);
    void (async () => {
      try {
        const result = await generateInvoicePdf({
          invoice,
          profile: profile.data ?? {
            businessName: "",
            abn: "",
            address: "",
            email: "",
            phone: "",
            gstRegistered: true,
          },
          settings: settings.data ?? {
            numbering: { mode: "auto", prefix: "INV-", counter: 0 },
            lineItemMode: "basic",
            defaultGstRate: 0.1,
            defaultPaymentTermsDays: 14,
            defaultCurrency: "AUD",
            paymentDetails: {},
            themeMode: "system",
            biometricEnabled: false,
          },
        });
        if (cancelled) return;
        setPdfUri(result.uri);
        setPdfHtml(result.html);
      } catch (err) {
        if (!cancelled) {
          toast.show({
            message: err instanceof Error ? err.message : "PDF failed.",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, profile.data, settings.data]);

  const display = deriveDisplayStatus(invoice);

  async function share() {
    if (!pdfUri) return;
    setSharing(true);
    try {
      await shareInvoicePdf(pdfUri, `${invoice.number}.pdf`);
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't share.",
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
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't duplicate.",
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
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't archive.",
        variant: "error",
      });
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
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View>
            <Text className="text-h2 text-foreground">{invoice.number}</Text>
            <Text className="text-caption text-muted">
              {invoice.clientSnapshot.name}
            </Text>
          </View>
        </View>
        <StatusBadge status={display} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        <Card className="p-0 overflow-hidden">
          <View style={{ height: 520 }}>
            {generating ? (
              <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator color="#0B3D5C" />
                <Text className="mt-2 text-caption text-muted">
                  Generating PDF…
                </Text>
              </View>
            ) : Platform.OS === "web" ? (
              pdfHtml ? (
                <iframe
                  srcDoc={pdfHtml}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  title={`${invoice.number} preview`}
                />
              ) : null
            ) : pdfUri ? (
              <WebView source={{ uri: pdfUri }} style={{ flex: 1 }} />
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
        </Card>

        <View className="gap-2">
          <Button
            label={sharing ? "Sharing…" : "Share PDF"}
            disabled={!pdfUri || sharing}
            onPress={share}
          />
          <Button label="Duplicate as draft" variant="secondary" onPress={duplicate} />
          {invoice.status !== "draft" ? (
            <Button
              label="Archive"
              variant="ghost"
              onPress={() => setConfirmArchive(true)}
            />
          ) : null}
        </View>

        <Card>
          <Text className="text-label text-muted">Phase 3</Text>
          <Text className="mt-1 text-caption text-muted">
            Mark paid, Record payment, and Issue credit note land alongside
            payment tracking in Phase 3.
          </Text>
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={confirmArchive}
        title={`Archive ${invoice.number}?`}
        description="Archived invoices are hidden from the main list but kept on file for ATO retention."
        confirmLabel="Archive"
        destructive
        onCancel={() => setConfirmArchive(false)}
        onConfirm={performArchive}
      />
    </View>
  );
}
