import { Text, View } from "react-native";
import { type ReactNode, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoginScreen } from "@/features/auth/LoginScreen";

export function Gate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const prevStatus = useRef(auth.status);

  // When the user signs in, redirect to the dashboard so stale navigation
  // state (e.g. /paywall from a previous session) doesn't resurface.
  useEffect(() => {
    if (prevStatus.current !== "ready" && auth.status === "ready") {
      router.replace("/(tabs)/dashboard");
    }
    prevStatus.current = auth.status;
  }, [auth.status, router]);

  if (auth.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">Loading…</Text>
      </View>
    );
  }

  if (auth.status === "unauthenticated") {
    return <LoginScreen />;
  }

  if (auth.status === "unconfigured" || auth.status === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-h1 text-foreground">Configuration error</Text>
        <Text className="mt-2 text-center text-body text-muted">
          {auth.status === "error"
            ? auth.error.message
            : "Firebase is not configured. Check your .env file."}
        </Text>
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}
