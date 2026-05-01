import { useState } from "react";
import { Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { useInvoices } from "@/src/features/invoices/queries";
import { useCreditNotes } from "@/src/features/credit-notes/queries";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import { exportCsvZip, exportPdfZip } from "@/src/lib/exports/runExports";
import { useRouter } from "expo-router";
import { useInvoiceListStore } from "@/src/features/invoices/store";

export function DataCard() {
  const toast = useToast();
  const router = useRouter();
  const setStatusFilter = useInvoiceListStore((s) => s.setStatusFilter);
  const invoicesQuery = useInvoices({ includeDeleted: true });
  const creditNotesQuery = useCreditNotes();
  const profile = useProfile();
  const settings = useSettings();
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  function openArchived() {
    setStatusFilter("archived");
    router.push("/invoices");
  }

  const invoices = invoicesQuery.data ?? [];
  const creditNotes = creditNotesQuery.data ?? [];

  async function runCsv() {
    setBusy("csv");
    try {
      await exportCsvZip(
        invoices.filter((i) => !i.deletedAt),
        creditNotes.filter((c) => !c.deletedAt),
      );
      toast.show({ message: "CSV exported.", variant: "success" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Export failed.",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function runPdfs() {
    setBusy("pdf");
    try {
      const liveInvoices = invoices.filter((i) => !i.deletedAt);
      if (liveInvoices.length > 50) {
        toast.show({
          message:
            ">50 invoices uses a Cloud Function path that lights up in Phase 4.",
          variant: "warning",
        });
        return;
      }
      await exportPdfZip(
        liveInvoices,
        creditNotes.filter((c) => !c.deletedAt),
        profile.data ?? {
          businessName: "",
          abn: "",
          address: "",
          email: "",
          phone: "",
          gstRegistered: true,
        },
        settings.data ?? {
          numbering: { mode: "auto", prefix: "INV-", minDigits: 4, counter: 0 },
          lineItemMode: "basic",
          defaultGstRate: 0.1,
          defaultPaymentTermsDays: 14,
          defaultCurrency: "AUD",
          paymentDetails: {},
          themeMode: "system",
          biometricEnabled: false,
        },
      );
      toast.show({ message: "PDFs exported.", variant: "success" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Export failed.",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Data</Text>
      <Text className="mt-1 text-caption text-muted">
        Bulk exports for accountants and backups. Includes credit notes.
      </Text>
      <View className="mt-4 gap-2">
        <Button
          label={busy === "csv" ? "Exporting…" : "Export CSV (zipped)"}
          variant="secondary"
          disabled={busy !== null}
          onPress={runCsv}
        />
        <Button
          label={busy === "pdf" ? "Exporting…" : "Export PDFs (zipped)"}
          variant="secondary"
          disabled={busy !== null}
          onPress={runPdfs}
        />
        <Button
          label="Open archived invoices"
          variant="ghost"
          onPress={openArchived}
        />
      </View>
    </Card>
  );
}
