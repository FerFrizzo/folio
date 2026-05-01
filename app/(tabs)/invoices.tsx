import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { Chip } from "@/src/components/ui/Chip";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FAB } from "@/src/components/ui/FAB";
import { ListRowSkeleton } from "@/src/components/ui/Skeleton";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { mockInvoices } from "@/src/mocks/invoices";
import type { Invoice } from "@/src/types/invoice";
import { deriveDisplayStatus } from "@/src/types/invoice";
import {
  useInvoiceListStore,
  type InvoiceStatusFilter,
} from "@/src/features/invoices/store";
import { InvoiceRow } from "@/src/features/invoices/InvoiceRow";

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
  const { query, statusFilter, setQuery, setStatusFilter } = useInvoiceListStore();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [contextInvoice, setContextInvoice] = useState<Invoice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    // Phase 1: simulate a brief load so the skeleton state is visible.
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockInvoices.filter((inv) => {
      const display = deriveDisplayStatus(inv);
      if (statusFilter !== "all" && display !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.clientSnapshot.name.toLowerCase().includes(q)
      );
    });
  }, [query, statusFilter]);

  function showSoon(action: string) {
    toast.show({ message: `${action} — coming in Phase 2.`, variant: "info" });
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header — sticky search + chips. On web, also a "+ New invoice" button. */}
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-h1 text-foreground">Invoices</Text>
          {isWeb ? (
            <Button
              label="+ New invoice"
              onPress={() => showSoon("Creating an invoice")}
            />
          ) : null}
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

      {loading ? (
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
          onCtaPress={
            statusFilter === "all"
              ? () => showSoon("Creating an invoice")
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(inv) => inv.id}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border" />
          )}
          renderItem={({ item }) => (
            <InvoiceRow
              invoice={item}
              onPress={() => showSoon(`Opening ${item.number}`)}
              onLongPress={() => setContextInvoice(item)}
              onMarkPaid={() =>
                toast.show({
                  message: `${item.number} marked paid.`,
                  variant: "success",
                  actionLabel: "Undo",
                  onAction: () => undefined,
                })
              }
              onDelete={() => setPendingDelete(item)}
              onRecordPayment={() => showSoon("Recording a payment")}
            />
          )}
        />
      )}

      <FAB
        accessibilityLabel="Create invoice"
        onPress={() => showSoon("Creating an invoice")}
      />

      {/* Long-press context menu — Sheet (BottomSheet on mobile, Modal on web). */}
      <Sheet
        visible={!!contextInvoice}
        onClose={() => setContextInvoice(null)}
        title={contextInvoice?.number}
      >
        <View className="gap-2">
          {[
            { label: "Edit", onPress: () => showSoon("Editing invoice") },
            { label: "Duplicate", onPress: () => showSoon("Duplicating invoice") },
            { label: "Share", onPress: () => showSoon("Sharing invoice") },
          ].map((a) => (
            <Button
              key={a.label}
              variant="secondary"
              label={a.label}
              onPress={() => {
                setContextInvoice(null);
                a.onPress();
              }}
            />
          ))}
          <Button
            variant="danger"
            label="Delete"
            onPress={() => {
              const target = contextInvoice;
              setContextInvoice(null);
              if (target) setPendingDelete(target);
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
        title={`Delete ${pendingDelete?.number ?? ""}?`}
        description="Drafts can be deleted permanently. Sent invoices are archived per ATO retention rules."
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) {
            toast.show({
              message: `${target.number} deleted (mock).`,
              variant: "warning",
            });
          }
        }}
      />
    </View>
  );
}
