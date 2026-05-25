import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Constants from "expo-constants";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth, signOut } from "@/src/features/auth/AuthProvider";

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://example.com/privacy";
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? "https://example.com/terms";

export function AboutCard() {
  const auth = useAuth();
  const toast = useToast();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const version = Constants.expoConfig?.version ?? "—";
  const linked = auth.status === "ready" && !auth.user.isAnonymous;
  const account = linked
    ? auth.user.email ?? auth.user.uid
    : "Anonymous (not linked)";

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't open link.",
        variant: "error",
      });
    }
  }

  async function performSignOut() {
    setConfirmSignOut(false);
    try {
      await signOut();
      toast.show({ message: "Signed out.", variant: "info" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't sign out.",
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">About</Text>
      <View className="mt-3 gap-1">
        <Text className="text-caption text-muted">Version</Text>
        <Text className="text-body text-foreground">{version}</Text>
      </View>
      <View className="mt-3 gap-1">
        <Text className="text-caption text-muted">Account</Text>
        <Text className="text-body text-foreground" numberOfLines={1}>
          {account}
        </Text>
      </View>

      <View className="mt-4 gap-2">
        <Pressable
          onPress={() => open(PRIVACY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Privacy policy"
          className="rounded-button border border-border bg-surface px-3 py-2 active:bg-background"
        >
          <Text className="text-body text-foreground">Privacy policy →</Text>
        </Pressable>
        <Pressable
          onPress={() => open(TERMS_URL)}
          accessibilityRole="link"
          accessibilityLabel="Terms of service"
          className="rounded-button border border-border bg-surface px-3 py-2 active:bg-background"
        >
          <Text className="text-body text-foreground">Terms of service →</Text>
        </Pressable>
      </View>

      <View className="mt-4">
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => setConfirmSignOut(true)}
        />
        {linked ? null : (
          <Text className="mt-1 text-caption text-muted">
            Signing out clears the current device session and starts fresh on
            next launch. Linked accounts can re-sign-in any time.
          </Text>
        )}
      </View>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sign out?"
        description={
          linked
            ? "You can sign back in with your linked account next time."
            : "You're signed in anonymously — signing out will lose access to the data on this device unless you've linked an account."
        }
        confirmLabel="Sign out"
        destructive
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={performSignOut}
      />
    </Card>
  );
}
