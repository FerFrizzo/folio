import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Card, Switch } from "@/src/components/ui";
import { isOptedOut, setOptOut } from "@/src/lib/analytics";

export function UsageDataCard() {
  const [sharing, setSharing] = useState(true);
  // Guards against the initial fetch resolving after (and clobbering) a
  // manual toggle the user made before it settled.
  const interactedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void isOptedOut().then((out) => {
      if (!cancelled && !interactedRef.current) setSharing(!out);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onChange(next: boolean) {
    interactedRef.current = true;
    setSharing(next);
    await setOptOut(!next);
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Privacy</Text>
      <View className="mt-3">
        <Switch
          label="Share usage data"
          helperText="Helps improve Folio. Never includes invoice, client, or payment details."
          value={sharing}
          onValueChange={(v) => void onChange(v)}
        />
      </View>
    </Card>
  );
}
