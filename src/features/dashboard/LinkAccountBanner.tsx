import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { useLinkBannerStore } from "@/src/features/dashboard/linkBannerStore";

const SILENCE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function LinkAccountBanner() {
  const auth = useAuth();
  const toast = useToast();
  const dismissedAt = useLinkBannerStore((s) => s.dismissedAt);
  const dismiss = useLinkBannerStore((s) => s.dismiss);
  const hydrate = useLinkBannerStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (auth.status !== "ready") return null;
  // expo-router/firebase-auth — anonymous users should see the banner.
  // The Firebase User has `isAnonymous: boolean`.
  if (!auth.user.isAnonymous) return null;
  if (dismissedAt && Date.now() - dismissedAt < SILENCE_MS) return null;

  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-h2 text-foreground">Secure your data</Text>
          <Text className="mt-1 text-caption text-muted">
            Link an account so your invoices stay safe across devices and
            reinstalls. Your existing data carries over.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss for 30 days"
          onPress={dismiss}
          hitSlop={8}
        >
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Button
          label="Continue with Apple"
          variant="secondary"
          onPress={() =>
            toast.show({
              message: "Apple sign-in lands in Phase 5.",
              variant: "info",
            })
          }
        />
        <Button
          label="Continue with Google"
          variant="secondary"
          onPress={() =>
            toast.show({
              message: "Google sign-in lands in Phase 5.",
              variant: "info",
            })
          }
        />
      </View>
    </Card>
  );
}
