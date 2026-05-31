import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, Plus } from "lucide-react-native";
import { Input } from "@/src/components/ui/Input";
import { Sheet } from "@/src/components/ui/Sheet";
import { Button } from "@/src/components/ui/Button";
import { ListRow } from "@/src/components/ui/ListRow";
import { useClients, useCreateClient } from "@/src/features/clients/queries";
import type { Client, ClientSnapshot } from "@/src/types/schemas";

type Props = {
  clientId: string | null;
  snapshot: ClientSnapshot;
  onChange: (clientId: string | null, snapshot: ClientSnapshot) => void;
  error?: string | null;
};

export function ClientSection({ clientId, snapshot, onChange, error }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const clients = useClients();
  const createClient = useCreateClient();

  function pickExisting(client: Client) {
    onChange(client.id, {
      name: client.name,
      ...(client.email ? { email: client.email } : {}),
      ...(client.address ? { address: client.address } : {}),
      ...(client.abn ? { abn: client.abn } : {}),
    });
    setPickerOpen(false);
  }

  async function createAndPick() {
    if (!newName.trim()) return;
    const created = await createClient.mutateAsync({
      name: newName.trim(),
      ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
    });
    pickExisting(created);
    setNewName("");
    setNewEmail("");
    setCreatingNew(false);
  }

  return (
    <View className="gap-3">
      {clientId ? (
        <View className="rounded-card border border-border bg-background p-3">
          <Text className="text-body font-semibold text-foreground">
            {snapshot.name}
          </Text>
          {snapshot.email ? (
            <Text className="mt-1 text-caption text-muted">{snapshot.email}</Text>
          ) : null}
          {snapshot.abn ? (
            <Text className="mt-1 text-caption text-muted">ABN {snapshot.abn}</Text>
          ) : null}
          <View className="mt-3">
            <Button
              label="Change client"
              variant="ghost"
              onPress={() => setPickerOpen(true)}
            />
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Pick a client"
          className="h-11 flex-row items-center justify-between rounded-button border border-dashed border-border bg-surface px-3"
        >
          <Text className="text-body text-muted">Select a client</Text>
          <ChevronDown size={18} color="#4B5563" />
        </Pressable>
      )}
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}

      <Sheet
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setCreatingNew(false);
        }}
        title="Pick a client"
      >
        {creatingNew ? (
          <View className="gap-3">
            <Input
              label="Name"
              required
              value={newName}
              onChangeText={setNewName}
              placeholder="Acme Pty Ltd"
            />
            <Input
              label="Email"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View className="flex-row gap-2">
              <Button label="Add client" onPress={createAndPick} />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setCreatingNew(false)}
              />
            </View>
          </View>
        ) : (
          <View>
            <Pressable
              onPress={() => setCreatingNew(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a new client"
              className="flex-row items-center gap-2 rounded-button border border-dashed border-accent bg-surface p-3"
            >
              <Plus size={16} color="#1473FF" />
              <Text className="text-body font-semibold text-accent">
                Add new client
              </Text>
            </Pressable>
            <View className="mt-3 max-h-80 overflow-hidden rounded-card border border-border bg-surface">
              {(clients.data ?? []).length === 0 ? (
                <Text className="p-4 text-body text-muted">
                  No clients yet. Add one above.
                </Text>
              ) : (
                (clients.data ?? []).map((c, idx, arr) => (
                  <View key={c.id}>
                    <ListRow
                      primary={c.name}
                      secondary={c.email || c.abn || ""}
                      onPress={() => pickExisting(c)}
                      accessibilityLabel={`Pick ${c.name}`}
                    />
                    {idx < arr.length - 1 ? (
                      <View className="h-px bg-border" />
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}
