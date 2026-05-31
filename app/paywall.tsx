import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { X } from "lucide-react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
    if (!key || Constants.executionEnvironment === "storeClient") return;

    async function check() {
      const configured = await Purchases.isConfigured();
      if (!cancelled && configured) setReady(true);
    }
    void check();
    return () => { cancelled = true; };
  }, []);

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
      {ready ? (
        <RevenueCatUI.Paywall
          onPurchaseCompleted={onPurchased}
          onRestoreCompleted={onPurchased}
          onDismiss={() => router.back()}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Image
            source={require("../assets/images/icon.png")}
            style={{ width: 96, height: 96, borderRadius: 22 }}
            resizeMode="contain"
          />
          <View className="items-center gap-2">
            <Text className="text-h1 font-bold text-foreground">Unlock Folio Pro</Text>
            <ActivityIndicator className="mt-4" color="#1473FF" />
          </View>
        </View>
      )}
    </View>
  );
}
