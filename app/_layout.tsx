import "@/global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/src/features/auth/AuthProvider";
import { Gate } from "@/src/features/auth/Gate";
import { ToastProvider } from "@/src/components/ui";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
