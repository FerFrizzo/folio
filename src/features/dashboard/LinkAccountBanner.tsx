import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { useLinkBannerStore } from "@/src/features/dashboard/linkBannerStore";
import {
  appleAvailableOnPlatform,
  linkApple,
} from "@/src/features/auth/linking/apple";
import {
  googleConfigured,
  linkGoogleWeb,
  linkGoogleWithIdToken,
  useGoogleAuth,
} from "@/src/features/auth/linking/google";
import { classifyLinkError } from "@/src/features/auth/linking/linkErrors";

const SILENCE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function LinkAccountBanner() {
  const auth = useAuth();
  const toast = useToast();
  const dismissedAt = useLinkBannerStore((s) => s.dismissedAt);
  const dismiss = useLinkBannerStore((s) => s.dismiss);
  const hydrate = useLinkBannerStore((s) => s.hydrate);

  const { promptAsync, response } = useGoogleAuth();
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!response || response.type !== "success") return;
    const idToken = response.authentication?.idToken;
    if (!idToken) return;
    setBusy("google");
    linkGoogleWithIdToken(idToken)
      .then(() => {
        toast.show({ message: "Account linked.", variant: "success" });
      })
      .catch((err) => {
        const { message } = classifyLinkError(err);
        toast.show({ message, variant: "error" });
      })
      .finally(() => setBusy(null));
  }, [response, toast]);

  if (auth.status !== "ready") return null;
  if (!auth.user.isAnonymous) return null;
  if (dismissedAt && Date.now() - dismissedAt < SILENCE_MS) return null;

  async function onApple() {
    setBusy("apple");
    try {
      const result = await linkApple();
      if (!result.ok) {
        if (result.reason === "not-available") {
          toast.show({
            message: "Apple Sign-In isn't available on this device.",
            variant: "error",
          });
        } else if (result.reason === "unsupported") {
          toast.show({
            message: "Apple Sign-In is iOS + Web only.",
            variant: "error",
          });
        } else {
          toast.show({ message: "Couldn't link.", variant: "error" });
        }
        return;
      }
      toast.show({ message: "Account linked.", variant: "success" });
    } catch (err) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    if (Platform.OS === "web") {
      setBusy("google");
      try {
        const result = await linkGoogleWeb();
        if (!result.ok) {
          toast.show({ message: "Couldn't link.", variant: "error" });
          return;
        }
        toast.show({ message: "Account linked.", variant: "success" });
      } catch (err) {
        const { message } = classifyLinkError(err);
        toast.show({ message, variant: "error" });
      } finally {
        setBusy(null);
      }
      return;
    }

    if (!googleConfigured()) {
      toast.show({
        message:
          "Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars first. See docs/AUTH_PROVIDERS.md.",
        variant: "error",
      });
      return;
    }
    setBusy("google");
    try {
      await promptAsync();
      // The follow-on linkGoogleWithIdToken runs inside the response useEffect.
    } catch (err) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
      setBusy(null);
    }
  }

  const showApple = appleAvailableOnPlatform();

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
      <View className="mt-3 flex-row flex-wrap gap-2">
        {showApple ? (
          <Button
            label={busy === "apple" ? "Connecting…" : "Continue with Apple"}
            variant="secondary"
            disabled={busy !== null}
            onPress={onApple}
          />
        ) : null}
        <Button
          label={busy === "google" ? "Connecting…" : "Continue with Google"}
          variant="secondary"
          disabled={busy !== null}
          onPress={onGoogle}
        />
      </View>
    </Card>
  );
}
