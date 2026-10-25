import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Chip } from "@/src/components/ui/Chip";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FAB } from "@/src/components/ui/FAB";
import { ListRowSkeleton } from "@/src/components/ui/Skeleton";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import type { CreditNote, Invoice } from "@/src/types/schemas";
import { deriveDisplayStatus } from "@/src/lib/invoice-status";
import { formatMoney } from "@/src/lib/money";
import {
  useInvoiceListStore,
  type InvoiceStatusFilter,
} from "@/src/features/invoices/store";
import { ListRow } from "@/src/components/ui/ListRow";
import { InvoiceRow } from "@/src/features/invoices/InvoiceRow";
import {
  useArchiveInvoice,
  useDeleteDraft,
  useInvoices,
  useRestoreInvoice,
} from "@/src/features/invoices/queries";
import {
  useCreditNotes,
  useRestoreCreditNote,
} from "@/src/features/credit-notes/queries";
import { PaymentSheet } from "@/src/features/invoices/PaymentSheet";
import { restoreWithFeedback } from "@/src/features/invoices/restoreWithFeedback";
import { errorMessage } from "@/src/lib/zod-message";

const FILTERS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "archived", label: "Archived" },
];

const FILTERED_EMPTY_LABELS: Record<InvoiceStatusFilter, string> = {
  all: "No invoices yet.",
  draft: "No draft invoices.",
  sent: "No sent invoices.",
  partial: "No partially paid invoices.",
  paid: "No paid invoices.",
  archived: "Nothing archived.",
};

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { query, statusFilter, setQuery, setStatusFilter } = useInvoiceListStore();
  const toast = useToast();

  const showArchived = statusFilter === "archived";
  const invoicesQuery = useInvoices({ includeDeleted: showArchived });
  const deleteDraft = useDeleteDraft();
  const archiveInvoice = useArchiveInvoice();
  const restoreInvoice = useRestoreInvoice();
  const creditNotesQuery = useCreditNotes(showArchived);
  const restoreCreditNote = useRestoreCreditNote();

  const [contextInvoice, setContextInvoice] = useState<Invoice | null>(null);
  const [contextNote, setContextNote] = useState<CreditNote | null>(null);
  const [pendingArchive, setPendingArchive] = useState<Invoice | null>(null);
  const [pendingPermanent, setPendingPermanent] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const all = useMemo(
    () => invoicesQuery.data ?? [],
    [invoicesQuery.data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((inv) => {
      if (statusFilter === "archived") {
        if (!inv.deletedAt) return false;
      } else {
        if (inv.deletedAt) return false;
        const display = deriveDisplayStatus(inv);
        if (statusFilter !== "all" && display !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.clientSnapshot.name.toLowerCase().includes(q)
      );
    });
  }, [all, query, statusFilter]);

  const archivedNotes = useMemo(
    () => (showArchived ? (creditNotesQuery.data ?? []).filter((cn) => cn.deletedAt) : []),
    [creditNotesQuery.data, showArchived],
  );

  function goNew() {
    router.push("/invoices/new");
  }

  function openInvoice(inv: Invoice) {
    router.push(`/invoices/${inv.id}`);
  }

  function confirmArchive(inv: Invoice) {
    setPendingArchive(inv);
  }

  async function performArchive() {
    const target = pendingArchive;
    setPendingArchive(null);
    if (!target) return;
    try {
      await archiveInvoice.mutateAsync(target.id);
      toast.show({ message: `${target.number || "Draft"} archived.`, variant: "warning" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't archive."),
        variant: "error",
      });
    }
  }

  async function performPermanentDelete() {
    const target = pendingPermanent;
    setPendingPermanent(null);
    if (!target || target.status !== "draft") return;
    try {
      await deleteDraft.mutateAsync(target.id);
      toast.show({ message: `${target.number || "Draft"} deleted.`, variant: "warning" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't delete."),
        variant: "error",
      });
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-h1 text-foreground">Invoices</Text>
          {isWeb ? <Button label="+ New invoice" onPress={goNew} /> : null}
        </View>
        <View className="mt-3 h-11 flex-row items-center rounded-button border border-border bg-surface px-3">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by number or client"
            placeholderTextColor="#9CA3AF"
            className="ml-2 flex-1 text-body text-foreground"
            accessibilityLabel="Search invoices"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={statusFilter === f.value}
              onPress={() => setStatusFilter(f.value)}
              status={
                f.value === "all" || f.value === "archived" ? undefined : f.value
              }
            />
          ))}
        </ScrollView>
      </View>

      {invoicesQuery.isLoading ? (
        <View>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ListRowSkeleton key={i} />
          ))}
        </View>
      ) : filtered.length === 0 && archivedNotes.length === 0 ? (
        <EmptyState
          title={FILTERED_EMPTY_LABELS[statusFilter]}
          description={
            statusFilter === "all" ? "Create your first invoice." : undefined
          }
          ctaLabel={statusFilter === "all" ? "Create your first invoice" : undefined}
          onCtaPress={statusFilter === "all" ? goNew : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(inv) => inv.id}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          refreshControl={
            !isWeb ? (
              <RefreshControl
                refreshing={invoicesQuery.isFetching && !invoicesQuery.isLoading}
                onRefresh={() => {
                  void invoicesQuery.refetch();
                  void creditNotesQuery.refetch();
                }}
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <View
              style={item.deletedAt ? { opacity: 0.6 } : undefined}
            >
              <InvoiceRow
                invoice={item}
                onPress={openInvoice}
                onLongPress={setContextInvoice}
                onDelete={item.deletedAt ? undefined : confirmArchive}
                onMarkPaid={
                  item.deletedAt ? undefined : async (inv) => setPaymentInvoice(inv)
                }
                onRecordPayment={
                  item.deletedAt ? undefined : (inv) => setPaymentInvoice(inv)
                }
              />
            </View>
          )}
          ListFooterComponent={
            showArchived ? (
              <View className="mt-6 px-4 pb-24">
                <Text className="text-h2 text-foreground">Credit notes</Text>
                {archivedNotes.length === 0 ? (
                  <Text className="mt-2 text-body text-muted">No archived credit notes.</Text>
                ) : (
                  <View className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
                    {archivedNotes.map((cn) => (
                      <ListRow
                        key={cn.id}
                        primary={cn.number}
                        secondary={`Against ${cn.originalInvoiceNumber}`}
                        trailingAmount={formatMoney(cn.totalCents, cn.currency)}
                        onPress={() => router.push(`/credit-notes/${cn.id}`)}
                        onLongPress={() => setContextNote(cn)}
                        accessibilityLabel={`Archived credit note ${cn.number}`}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null
          }
        />
      )}

      <FAB accessibilityLabel="Create invoice" onPress={goNew} />

      <Sheet
        visible={!!contextInvoice}
        onClose={() => setContextInvoice(null)}
        title={contextInvoice?.number || "Draft"}
      >
        <View className="gap-2">
          {contextInvoice?.deletedAt ? (
            <>
              <Button
                variant="secondary"
                label="View"
                onPress={() => {
                  const t = contextInvoice;
                  setContextInvoice(null);
                  if (t) router.push(`/invoices/${t.id}`);
                }}
              />
              <Button
                label="Restore"
                onPress={async () => {
                  const t = contextInvoice;
                  setContextInvoice(null);
                  if (!t) return;
                  await restoreWithFeedback(
                    t.number || "Draft",
                    () => restoreInvoice.mutateAsync(t.id),
                    toast,
                  );
                }}
              />
              {contextInvoice?.status === "draft" ? (
                <Button
                  variant="danger"
                  label="Delete permanently"
                  onPress={() => {
                    const t = contextInvoice;
                    setContextInvoice(null);
                    if (t) setPendingPermanent(t);
                  }}
                />
              ) : (
                <Text className="text-caption text-muted">
                  Issued invoices are kept for ATO record-keeping and can&apos;t be deleted.
                </Text>
              )}
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                label={contextInvoice?.status === "draft" ? "Edit" : "View"}
                onPress={() => {
                  const t = contextInvoice;
                  setContextInvoice(null);
                  if (t) router.push(`/invoices/${t.id}`);
                }}
              />
              <Button
                variant="danger"
                label="Archive"
                onPress={() => {
                  const target = contextInvoice;
                  setContextInvoice(null);
                  if (target) confirmArchive(target);
                }}
              />
            </>
          )}
          <Button
            variant="ghost"
            label="Cancel"
            onPress={() => setContextInvoice(null)}
          />
        </View>
      </Sheet>

      <PaymentSheet
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
      />

      <Sheet
        visible={!!contextNote}
        onClose={() => setContextNote(null)}
        title={contextNote?.number ?? "Credit note"}
      >
        <View className="gap-2">
          <Button
            variant="secondary"
            label="View"
            onPress={() => {
              const note = contextNote;
              setContextNote(null);
              if (note) router.push(`/credit-notes/${note.id}`);
            }}
          />
          <Button
            label="Restore"
            onPress={async () => {
              const note = contextNote;
              setContextNote(null);
              if (!note) return;
              await restoreWithFeedback(
                note.number,
                () => restoreCreditNote.mutateAsync(note.id),
                toast,
              );
            }}
          />
          <Text className="text-caption text-muted">
            Issued credit notes are kept for ATO record-keeping and can&apos;t be deleted.
          </Text>
          <Button variant="ghost" label="Cancel" onPress={() => setContextNote(null)} />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={!!pendingArchive}
        title={`Archive ${pendingArchive?.number || "this draft"}?`}
        description="Archived documents are hidden from the active lists and balances, and kept on file. Issued invoices and credit notes are retained for ATO record-keeping."
        confirmLabel="Archive"
        destructive
        onCancel={() => setPendingArchive(null)}
        onConfirm={performArchive}
      />

      <ConfirmDialog
        visible={!!pendingPermanent}
        title={`Delete ${pendingPermanent?.number || "this draft"} permanently?`}
        description="Only unsent drafts can be deleted. This can't be undone."
        confirmLabel="Delete permanently"
        destructive
        onCancel={() => setPendingPermanent(null)}
        onConfirm={performPermanentDelete}
      />
    </View>
  );
}
