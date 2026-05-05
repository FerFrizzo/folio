import "@/global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { vars, useColorScheme } from "nativewind";
import { AuthProvider } from "@/src/features/auth/AuthProvider";
import { Gate } from "@/src/features/auth/Gate";
import { ToastProvider } from "@/src/components/ui";

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

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
            <Gate>
              <ToastProvider>
                <StatusBar style="auto" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
              </ToastProvider>
            </Gate>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
