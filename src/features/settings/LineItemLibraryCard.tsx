import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Trash2, Plus } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { useToast } from "@/src/components/ui/Toast";
import { useSuccessButton } from "@/lib/useSuccessButton";
import { formatMoney } from "@/src/lib/money";
import {
  useCreateLibraryEntry,
  useDeleteLibraryEntry,
  useLineItemLibrary,
} from "@/src/features/settings/libraryQueries";

export function LineItemLibraryCard() {
  const library = useLineItemLibrary();
  const create = useCreateLibraryEntry();
  const remove = useDeleteLibraryEntry();
  const toast = useToast();
  const { succeeded, triggerSuccess } = useSuccessButton();

  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPriceText, setUnitPriceText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function add() {
    if (!description.trim()) {
      toast.show({ message: "Add a description first.", variant: "error" });
      return;
    }
    const unitPriceCents = Math.round(Number(unitPriceText) * 100) || 0;
    const defaultQty = Number(qty) || 1;
    try {
      await create.mutateAsync({
        description: description.trim(),
        defaultQty,
        unitPriceCents,
        gstRate: 0.1,
      });
      setAdding(false);
      setDescription("");
      setQty("1");
      setUnitPriceText("");
      triggerSuccess();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save.",
        variant: "error",
      });
    }
  }

  async function performDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    await remove.mutateAsync(id);
    toast.show({ message: "Removed.", variant: "info" });
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Line item library</Text>
      <Text className="mt-1 text-caption text-muted">
        Save common line items here, then tap Library on the editor to insert.
      </Text>
      <View className="mt-4 gap-2">
        {(library.data ?? []).length === 0 && !adding ? (
          <Text className="text-caption text-muted">No entries yet.</Text>
        ) : null}
        {(library.data ?? []).map((entry) => (
          <View
            key={entry.id}
            className="flex-row items-center justify-between border-b border-border py-2"
          >
            <View className="flex-1">
              <Text className="text-body text-foreground">{entry.description}</Text>
              <Text className="text-caption text-muted">
                {entry.defaultQty} × {formatMoney(entry.unitPriceCents, "AUD")} ·{" "}
                {(entry.gstRate * 100).toFixed(0)}% GST
              </Text>
            </View>
            <Pressable
              onPress={() => setPendingDelete(entry.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${entry.description}`}
              hitSlop={8}
            >
              <Trash2 size={16} color="#C0392B" />
            </Pressable>
          </View>
        ))}
        {adding ? (
          <View className="mt-2 gap-3 rounded-card border border-border bg-background p-3">
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Hour of design work"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <NumberInput label="Qty" value={qty} onChangeText={setQty} placeholder="1" />
              </View>
              <View className="flex-[2]">
                <CurrencyInput
                  label="Unit price"
                  value={unitPriceText}
                  onChangeText={setUnitPriceText}
                />
              </View>
            </View>
            <View className="flex-row justify-end gap-2">
              <Button label="Cancel" variant="ghost" onPress={() => setAdding(false)} />
              <Button
                label={succeeded ? "✓ Added" : create.isPending ? "Adding…" : "Add"}
                variant={succeeded ? "success" : "primary"}
                disabled={create.isPending || succeeded}
                onPress={add}
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a library entry"
            className="mt-2 flex-row items-center justify-center gap-2 rounded-button border border-dashed border-accent py-3"
          >
            <Plus size={16} color="#1473FF" />
            <Text className="text-body font-semibold text-accent">Add entry</Text>
          </Pressable>
        )}
      </View>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Remove this library entry?"
        description="This won't change any existing invoices."
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={performDelete}
      />
    </Card>
  );
}
