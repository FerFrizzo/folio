import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { X, ArrowRight } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useProfile, useSettings } from "@/src/features/settings/queries";
import { useMemo } from "react";

type Item = {
  key: string;
  label: string;
  href: "/onboarding" | "/onboarding/logo" | "/onboarding/payment";
};

export function OnboardingBanner() {
  const profile = useProfile();
  const settings = useSettings();
  const dismissed = useOnboardingStore((s) => s.dismissed);
  const dismiss = useOnboardingStore((s) => s.dismiss);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    if (!profile.data?.businessName) {
      out.push({ key: "profile", label: "Add business profile", href: "/onboarding" });
    }
    if (!profile.data?.logoUrl) {
      out.push({ key: "logo", label: "Add your logo", href: "/onboarding/logo" });
    }
    const pd = settings.data?.paymentDetails;
    const hasPaymentDetails = !!(pd?.bsb || pd?.payId || pd?.otherNotes);
    if (!hasPaymentDetails) {
      out.push({ key: "payment", label: "Add payment details", href: "/onboarding/payment" });
    }
    return out;
  }, [profile.data, settings.data]);

  if (items.length === 0 || dismissed) return null;

  return (
    <Card className="mx-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-h2 text-foreground">Finish setting up</Text>
          <Text className="mt-1 text-caption text-muted">
            A few more steps to a complete invoice. Skip anything you don&apos;t need yet.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss onboarding banner"
          onPress={dismiss}
          hitSlop={8}
        >
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
      <View className="mt-3 gap-2">
        {items.map((item) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.label}
              className="flex-row items-center justify-between rounded-button border border-border bg-surface px-3 py-2 active:bg-background"
            >
              <Text className="text-body text-foreground">{item.label}</Text>
              <ArrowRight size={16} color="#1473FF" />
            </Pressable>
          </Link>
        ))}
      </View>
    </Card>
  );
}
