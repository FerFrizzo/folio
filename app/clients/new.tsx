import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { IconButton } from "@/src/components/ui/IconButton";
import { ClientForm } from "@/src/features/clients/ClientForm";
import { useCreateClient } from "@/src/features/clients/queries";
import { useToast } from "@/src/components/ui/Toast";
import type { ClientInput } from "@/src/types/schemas";

export default function NewClientScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const create = useCreateClient();
  const toast = useToast();

  async function onSubmit(values: ClientInput) {
    try {
      await create.mutateAsync(values);
      toast.show({ message: "Client added.", variant: "success" });
      router.back();
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't add client.",
        variant: "error",
      });
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
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
        <Text className="text-h1 text-foreground">New client</Text>
      </View>
      <View className="px-4">
        <ClientForm submitLabel="Add client" onSubmit={onSubmit} />
      </View>
    </ScrollView>
  );
}
