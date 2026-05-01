import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/components/ui/Toast";
import { Link } from "expo-router";
import { setPin, clearPin, hasPin } from "@/src/features/auth/pin";
import { useEffect, useState } from "react";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [pinSet, setPinSet] = useState<boolean | null>(null);

  useEffect(() => {
    void hasPin().then(setPinSet);
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
    >
      <View className="gap-4 px-4">
        <Text className="text-h1 text-foreground">Settings</Text>

        <Card>
          <Text className="text-h2 text-foreground">Phase 1 dev tools</Text>
          <Text className="mt-1 text-caption text-muted">
            Real settings UI ships in Phase 2/3. These are scaffolds for verifying
            the foundation only.
          </Text>
          <View className="mt-4 gap-2">
            <Button
              label={pinSet ? "Reset demo PIN to 1234" : "Set demo PIN to 1234"}
              variant="secondary"
              onPress={async () => {
                await setPin("1234");
                setPinSet(true);
                toast.show({
                  message: "Demo PIN set to 1234. Reload the app to see the gate.",
                  variant: "success",
                });
              }}
            />
            <Button
              label="Clear demo PIN"
              variant="ghost"
              onPress={async () => {
                await clearPin();
                setPinSet(false);
                toast.show({ message: "Demo PIN cleared.", variant: "info" });
              }}
            />
            <Link href="/_dev/components" asChild>
              <Button label="Open component preview (dev)" variant="secondary" />
            </Link>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
