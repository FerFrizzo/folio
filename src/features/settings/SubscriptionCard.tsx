import { Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useSubscription, useEntitlement } from "@/src/features/settings/queries";

function planLabel(state: string | undefined, entitlement: "free" | "pro"): string {
  if (entitlement === "free") return "Free";
  if (state === "trial") return "Folio Pro (trial)";
  if (state === "grace") return "Folio Pro (payment issue)";
  return "Folio Pro";
}

export function SubscriptionCard() {
  const router = useRouter();
  const subscription = useSubscription();
  const entitlement = useEntitlement();
  const isPro = entitlement === "pro";
  const state = subscription.data?.state;
  const endsAt = subscription.data?.currentPeriodEndsAt;

  function openManage() {
    if (Platform.OS === "web") return;
    void import("react-native-purchases").then(({ default: Purchases }) =>
      Purchases.showManageSubscriptions(),
    );
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Subscription</Text>
      <View className="mt-3 gap-1">
        <Text className="text-caption text-muted">Current plan</Text>
        <Text className="text-body text-foreground">{planLabel(state, entitlement)}</Text>
        {isPro && endsAt ? (
          <Text className="text-caption text-muted">
            Renews {new Date(endsAt).toLocaleDateString("en-AU")}
          </Text>
        ) : null}
        {state === "grace" ? (
          <Text className="mt-1 text-caption" style={{ color: "#EF4444" }}>
            Payment issue — update your payment method in the App Store or Play Store.
          </Text>
        ) : null}
      </View>
      <View className="mt-4">
        {isPro ? (
          <Button label="Manage subscription" variant="secondary" onPress={openManage} />
        ) : (
          <Button
            label="Upgrade to Folio Pro"
            onPress={() => router.push("/paywall")}
          />
        )}
      </View>
    </Card>
  );
}
