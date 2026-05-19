import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useEntitlement } from "@/src/features/settings/queries";
import { useSubscriptionBannerStore } from "@/src/features/dashboard/subscriptionBannerStore";

export function SubscriptionBanner() {
  const entitlement = useEntitlement();
  const dismissed = useSubscriptionBannerStore((s) => s.dismissedForSession);
  const dismiss = useSubscriptionBannerStore((s) => s.dismiss);
  const router = useRouter();

  if (entitlement === "pro" || dismissed) return null;

  function handleDismiss() {
    dismiss();
  }

  return (
    <Card className="mx-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-h2 text-foreground">Try Folio Pro free for 30 days</Text>
          <Text className="mt-1 text-caption text-muted">
            Send invoices by email and remove PDF watermarks. $4.99/mo or $49.99/yr.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss upgrade banner"
          onPress={handleDismiss}
          hitSlop={8}
          className="pt-0.5"
        >
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
      <View className="mt-3">
        <Button label="Start free trial" onPress={() => router.push("/paywall")} />
      </View>
    </Card>
  );
}
