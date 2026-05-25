import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { IconButton } from "@/src/components/ui/IconButton";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ClientForm } from "@/src/features/clients/ClientForm";
import {
  useClient,
  useUpdateClient,
} from "@/src/features/clients/queries";
import { useToast } from "@/src/components/ui/Toast";
import type { ClientInput } from "@/src/types/schemas";

export default function EditClientScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientQuery = useClient(id);
  const update = useUpdateClient();

  async function onSubmit(values: ClientInput) {
    if (!id) return;
    try {
      await update.mutateAsync({ id, patch: values });
      toast.show({ message: "Client saved.", variant: "success" });
      router.back();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save client.",
        variant: "error",
      });
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
            <ClientForm
              initial={clientQuery.data}
              submitLabel="Save changes"
              onSubmit={onSubmit}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
