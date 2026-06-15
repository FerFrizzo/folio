import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
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
import { ListRowSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/Toast";
import {
  useClients,
  useSoftDeleteClient,
} from "@/src/features/clients/queries";
import type { Client } from "@/src/types/schemas";

const AVATAR_COLORS = [
  "#4F46E5",
  "#0891B2",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? "#4F46E5";
}

interface ClientRowProps {
  item: Client;
  onPress: () => void;
  onLongPress: () => void;
}

function ClientRow({ item, onPress, onLongPress }: ClientRowProps) {
  const initials = getInitials(item.name);
  const bgColor = getAvatarColor(item.name);
  const secondary = item.email || item.abn || "";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Client ${item.name}`}
      className="flex-row items-center px-4 py-3 bg-surface active:bg-background"
      style={{ gap: 12 }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18 }}
        >
          {initials}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-body font-semibold text-foreground">{item.name}</Text>
        {secondary ? (
          <Text className="text-caption text-muted" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

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
          refreshControl={
            !isWeb ? (
              <RefreshControl
                refreshing={clientsQuery.isFetching && !clientsQuery.isLoading}
                onRefresh={() => void clientsQuery.refetch()}
              />
            ) : undefined
          }
          renderItem={({ item }) => (
            <ClientRow
              item={item}
              onPress={() => router.push(`/clients/${item.id}`)}
              onLongPress={() => setPendingDelete(item)}
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
