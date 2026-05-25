import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import RevenueCatUI from "react-native-purchases-ui";
import { X } from "lucide-react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const auth = useAuth();

  async function onPurchased() {
    if (auth.status === "ready") {
      await qc.invalidateQueries({ queryKey: ["subscription", auth.user.uid] });
    }
    router.back();
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 16 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color="#111827" />
        </Pressable>
      </View>
      <RevenueCatUI.OriginalTemplatePaywallFooterContainerView
        onPurchaseCompleted={onPurchased}
        onRestoreCompleted={onPurchased}
        onDismiss={() => router.back()}
      >
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Image
            source={require("../assets/images/icon.png")}
            style={{ width: 96, height: 96, borderRadius: 22 }}
            resizeMode="contain"
          />
          <View className="items-center gap-2">
            <Text className="text-h1 font-bold text-foreground">Unlock Folio Pro</Text>
            <Text className="text-center text-body text-muted">
              Send invoices by email, download watermark-free PDFs.
            </Text>
          </View>
        </View>
      </RevenueCatUI.OriginalTemplatePaywallFooterContainerView>
    </View>
  );
}
