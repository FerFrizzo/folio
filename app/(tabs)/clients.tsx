import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FAB } from "@/src/components/ui/FAB";
import { ListRow } from "@/src/components/ui/ListRow";
import { ListRowSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/Toast";
import {
  useClients,
  useSoftDeleteClient,
} from "@/src/features/clients/queries";
import type { Client } from "@/src/types/schemas";

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const toast = useToast();
  const clientsQuery = useClients();
  const softDelete = useSoftDeleteClient();

  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  const all = useMemo(
    () => clientsQuery.data ?? [],
    [clientsQuery.data],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.abn?.toLowerCase().includes(q) ?? false),
    );
  }, [all, query]);

  function goNew() {
    router.push("/clients/new");
  }

  async function performDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    const result = await softDelete.mutateAsync(target.id);
    if (!result.ok) {
      toast.show({
        message: `Has ${result.count} invoice${result.count === 1 ? "" : "s"}, can't delete.`,
        variant: "warning",
      });
    } else {
      toast.show({ message: `${target.name} archived.`, variant: "info" });
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-h1 text-foreground">Clients</Text>
          {isWeb ? <Button label="+ New client" onPress={goNew} /> : null}
        </View>
        <View className="mt-3 h-11 flex-row items-center rounded-button border border-border bg-surface px-3">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, email, or ABN"
            placeholderTextColor="#9CA3AF"
            className="ml-2 flex-1 text-body text-foreground"
            accessibilityLabel="Search clients"
          />
        </View>
      </View>

      {clientsQuery.isLoading ? (
        <View>
          {[0, 1, 2, 3, 4].map((i) => (
            <ListRowSkeleton key={i} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? "No clients match your search." : "No clients yet."}
          description={query ? undefined : "Add a client to start invoicing them."}
          ctaLabel={query ? undefined : "Add your first client"}
          onCtaPress={query ? undefined : goNew}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          refreshControl={
            !isWeb ? (
              <RefreshControl
                refreshing={clientsQuery.isFetching && !clientsQuery.isLoading}
                onRefresh={() => void clientsQuery.refetch()}
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <ListRow
              primary={item.name}
              secondary={item.email || item.abn || ""}
              onPress={() => router.push(`/clients/${item.id}`)}
              onLongPress={() => setPendingDelete(item)}
              accessibilityLabel={`Client ${item.name}`}
            />
          )}
        />
      )}

      <FAB accessibilityLabel="Add client" onPress={goNew} />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={`Archive ${pendingDelete?.name ?? ""}?`}
        description="Archived clients are hidden from the list. Already-issued invoices keep their snapshot."
        confirmLabel="Archive"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={performDelete}
      />
    </View>
  );
}
