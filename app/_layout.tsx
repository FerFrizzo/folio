import "@/global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { vars, useColorScheme } from "nativewind";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { Gate } from "@/src/features/auth/Gate";
import { ToastProvider } from "@/src/components/ui";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";

const lightVars = vars({
  "--color-background": "#FAFAF7",
  "--color-surface": "#FFFFFF",
  "--color-border": "#E5E5E0",
  "--color-foreground": "#111827",
  "--color-muted": "#4B5563",
});

const darkVars = vars({
  "--color-background": "#0E1116",
  "--color-surface": "#171B22",
  "--color-border": "#2A2F38",
  "--color-foreground": "#F3F4F6",
  "--color-muted": "#9CA3AF",
});

function RevenueCatInitializer() {
  const auth = useAuth();
  const uid = auth.status === "ready" ? auth.user.uid : null;

  useEffect(() => {
    const key =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
    if (!key) {
      console.warn("[RevenueCat] No API key found — skipping initialization.");
      return;
    }
    if (Constants.executionEnvironment === "storeClient") {
      console.warn("[RevenueCat] Running in Expo Go — skipping initialization.");
      return;
    }
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    void Purchases.configure({ apiKey: key });
  }, []);

  useEffect(() => {
    if (!uid) return;
    void Purchases.isConfigured().then((configured) => {
      if (!configured) return;
      void Purchases.logIn(uid);
    });
  }, [uid]);

  return null;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => console.error("[Query error]", error),
        }),
        mutationCache: new MutationCache({
          onError: (error) => console.error("[Mutation error]", error),
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={colorScheme === "dark" ? darkVars : lightVars} className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <Gate>
                <RevenueCatInitializer />
                <StatusBar style="auto" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                >
                  <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
                </Stack>
              </Gate>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
