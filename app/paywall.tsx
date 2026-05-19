import { Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import RevenueCatUI from "react-native-purchases-ui";
import { X } from "lucide-react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

function isRevenueCatReady(): boolean {
  const key =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return !!key && Constants.executionEnvironment !== "storeClient";
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const auth = useAuth();
  const rcReady = isRevenueCatReady();

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
      <RevenueCatUI.Paywall
        onPurchaseCompleted={onPurchased}
        onRestoreCompleted={onPurchased}
        onDismiss={() => router.back()}
      />
    </View>
  );
}
