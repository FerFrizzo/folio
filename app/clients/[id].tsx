import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { IconButton } from "@/src/components/ui/IconButton";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ClientForm } from "@/src/features/clients/ClientForm";
import {
  useClient,
  useSoftDeleteClient,
  useUpdateClient,
} from "@/src/features/clients/queries";
import { useToast } from "@/src/components/ui/Toast";
import { useSuccessButton } from "@/src/lib/useSuccessButton";
import type { ClientInput } from "@/src/types/schemas";

export default function EditClientScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientQuery = useClient(id);
  const update = useUpdateClient();
  const softDelete = useSoftDeleteClient();
  const { succeeded, triggerSuccess } = useSuccessButton(800);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(values: ClientInput) {
    if (!id) return;
    try {
      await update.mutateAsync({ id, patch: values });
      triggerSuccess();
      await new Promise((r) => setTimeout(r, 800));
      router.back();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save client.",
        variant: "error",
      });
    }
  }

  async function performDelete() {
    setConfirmDelete(false);
    if (!id) return;
    const result = await softDelete.mutateAsync(id);
    if (!result.ok) {
      toast.show({
        message: `Has ${result.count} invoice${result.count === 1 ? "" : "s"}, can't delete.`,
        variant: "warning",
      });
    } else {
      toast.show({ message: `${clientQuery.data?.name ?? "Client"} deleted.`, variant: "info" });
      router.back();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 32,
          gap: 16,
        }}
      >
        <View className="flex-row items-center gap-2 px-4">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <Text className="text-h1 text-foreground">Edit client</Text>
        </View>
        <View className="px-4">
          {clientQuery.isLoading ? (
            <Skeleton height={300} />
          ) : !clientQuery.data ? (
            <Text className="text-body text-muted">Client not found.</Text>
          ) : (
            <>
              <ClientForm
                initial={clientQuery.data}
                submitLabel={succeeded ? "✓ Saved" : "Save changes"}
                submitVariant={succeeded ? "success" : "primary"}
                onSubmit={onSubmit}
              />
              <View className="mt-4">
                <Button
                  label="Delete client"
                  variant="danger"
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${clientQuery.data?.name ?? ""}?`}
        description="This client will be removed from your list. Already-issued invoices keep their snapshot."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={performDelete}
      />
    </KeyboardAvoidingView>
  );
}
