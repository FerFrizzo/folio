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
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import {
  generateCreditNotePdf,
  shareCreditNotePdf,
} from "@/src/lib/pdf/generate-credit-note";
import { useArchiveCreditNote } from "@/src/features/credit-notes/queries";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import type { CreditNote } from "@/src/types/schemas";

type Props = {
  creditNote: CreditNote;
};

export function CreditNoteDetail({ creditNote }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const profile = useProfile();
  const settings = useSettings();
  const archive = useArchiveCreditNote();
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
        const pdf = await generateCreditNotePdf({
          creditNote,
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
        if (cancelled) return;
        setPdfUri(pdf.uri);
        setPdfHtml(pdf.html);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creditNote, profile.data, settings.data]);

  async function share() {
    if (!pdfUri) return;
    setSharing(true);
    try {
      await shareCreditNotePdf(pdfUri, `${creditNote.number}.pdf`);
    } finally {
      setSharing(false);
    }
  }

  async function performArchive() {
    setConfirmArchive(false);
    await archive.mutateAsync(creditNote.id);
    toast.show({ message: `${creditNote.number} archived.`, variant: "info" });
    router.back();
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
            <Text className="text-h2 text-foreground">{creditNote.number}</Text>
            <Text className="text-caption text-muted">
              Against {creditNote.originalInvoiceNumber}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        <Card className="overflow-hidden p-0">
          <View style={{ height: 520 }}>
            {generating ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#1473FF" />
              </View>
            ) : Platform.OS === "web" ? (
              pdfHtml ? (
                <iframe
                  srcDoc={pdfHtml}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  title={`${creditNote.number} preview`}
                />
              ) : null
            ) : pdfUri ? (
              <WebView source={{ uri: pdfUri }} style={{ flex: 1 }} />
            ) : null}
          </View>
        </Card>

        <Card>
          <Text className="text-label text-muted">Credit total</Text>
          <Text className="mt-1 text-display font-bold text-status-overdue [font-feature-settings:'tnum']">
            {formatMoney(creditNote.totalCents, creditNote.currency)}
          </Text>
        </Card>

        <View className="gap-2">
          <Button
            label={sharing ? "Sharing…" : "Share PDF"}
            disabled={!pdfUri || sharing}
            onPress={share}
          />
          <Button
            label="Archive"
            variant="ghost"
            onPress={() => setConfirmArchive(true)}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmArchive}
        title={`Archive ${creditNote.number}?`}
        description="Archived credit notes are hidden but kept for ATO retention."
        confirmLabel="Archive"
        destructive
        onCancel={() => setConfirmArchive(false)}
        onConfirm={performArchive}
      />
    </View>
  );
}
