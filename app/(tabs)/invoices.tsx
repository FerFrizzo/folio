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
import type { Invoice } from "@/src/types/schemas";
import { deriveDisplayStatus } from "@/src/lib/invoice-status";
import {
  useInvoiceListStore,
  type InvoiceStatusFilter,
} from "@/src/features/invoices/store";
import { InvoiceRow } from "@/src/features/invoices/InvoiceRow";
import {
  useArchiveInvoice,
  useDeleteDraft,
  useInvoices,
} from "@/src/features/invoices/queries";

const FILTERS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

const FILTERED_EMPTY_LABELS: Record<InvoiceStatusFilter, string> = {
  all: "No invoices yet.",
  draft: "No draft invoices.",
  sent: "No sent invoices.",
  partial: "No partially paid invoices.",
  overdue: "No overdue invoices.",
  paid: "No paid invoices.",
};

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { query, statusFilter, setQuery, setStatusFilter } = useInvoiceListStore();
  const toast = useToast();

  const invoicesQuery = useInvoices();
  const deleteDraft = useDeleteDraft();
  const archiveInvoice = useArchiveInvoice();

  const [contextInvoice, setContextInvoice] = useState<Invoice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

  const all = useMemo(
    () => invoicesQuery.data ?? [],
    [invoicesQuery.data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((inv) => {
      const display = deriveDisplayStatus(inv);
      if (statusFilter !== "all" && display !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.clientSnapshot.name.toLowerCase().includes(q)
      );
    });
  }, [all, query, statusFilter]);

  function goNew() {
    router.push("/invoices/new");
  }

  function openInvoice(inv: Invoice) {
    router.push(`/invoices/${inv.id}`);
  }

  function confirmDelete(inv: Invoice) {
    setPendingDelete(inv);
  }

  async function performDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      if (target.status === "draft") {
        await deleteDraft.mutateAsync(target.id);
        toast.show({ message: `${target.number || "Draft"} deleted.`, variant: "warning" });
      } else {
        await archiveInvoice.mutateAsync(target.id);
        toast.show({ message: `${target.number} archived.`, variant: "warning" });
      }
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't delete.",
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
              status={f.value === "all" ? undefined : f.value}
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
      ) : filtered.length === 0 ? (
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
                onRefresh={() => void invoicesQuery.refetch()}
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <InvoiceRow
              invoice={item}
              onPress={openInvoice}
              onLongPress={setContextInvoice}
              onDelete={confirmDelete}
              // Phase 2: Mark paid + Record payment land in Phase 3 once
              // payment tracking exists. Hide the swipe affordances by passing
              // undefined handlers.
            />
          )}
        />
      )}

      <FAB accessibilityLabel="Create invoice" onPress={goNew} />

      <Sheet
        visible={!!contextInvoice}
        onClose={() => setContextInvoice(null)}
        title={contextInvoice?.number || "Draft"}
      >
        <View className="gap-2">
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
            label={contextInvoice?.status === "draft" ? "Delete" : "Archive"}
            onPress={() => {
              const target = contextInvoice;
              setContextInvoice(null);
              if (target) confirmDelete(target);
            }}
          />
          <Button
            variant="ghost"
            label="Cancel"
            onPress={() => setContextInvoice(null)}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={!!pendingDelete}
        title={
          pendingDelete?.status === "draft"
            ? `Delete ${pendingDelete?.number || "this draft"}?`
            : `Archive ${pendingDelete?.number ?? ""}?`
        }
        description={
          pendingDelete?.status === "draft"
            ? "Drafts are deleted permanently. This can't be undone."
            : "Archived invoices are hidden from the main list but kept on file for ATO retention."
        }
        confirmLabel={pendingDelete?.status === "draft" ? "Delete" : "Archive"}
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={performDelete}
      />
    </View>
  );
}
