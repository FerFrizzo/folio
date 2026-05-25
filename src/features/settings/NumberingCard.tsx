import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { formatAutoNumber } from "@/src/lib/numbering";
import {
  useSettings,
  useSetSettings,
} from "@/src/features/settings/queries";
import { SettingsSchema } from "@/src/types/schemas";
import { useSuccessButton } from "@/lib/useSuccessButton";

export function NumberingCard() {
  const settings = useSettings();
  const setSettings = useSetSettings();
  const toast = useToast();
  const { succeeded, triggerSuccess } = useSuccessButton();

  const [prefix, setPrefix] = useState("INV-");
  const [minDigitsText, setMinDigitsText] = useState("4");
  const [counterText, setCounterText] = useState("0");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setPrefix(settings.data.numbering.prefix);
    setMinDigitsText(String(settings.data.numbering.minDigits));
    setCounterText(String(settings.data.numbering.counter));
  }, [settings.data]);

  const minDigitsParsed = Math.max(3, Math.min(6, Number(minDigitsText) || 4));
  const counterParsed = Math.max(0, Math.floor(Number(counterText) || 0));

  const preview = formatAutoNumber({
    prefix,
    counter: counterParsed + 1,
    minDigits: minDigitsParsed,
  });

  async function save() {
    if (!settings.data) return;
    try {
      const next = SettingsSchema.parse({
        ...settings.data,
        numbering: {
          ...settings.data.numbering,
          prefix,
          minDigits: minDigitsParsed,
          counter: counterParsed,
        },
      });
      await setSettings.mutateAsync(next);
      triggerSuccess();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save.",
        variant: "error",
      });
    }
  }

  async function performReset() {
    setConfirmReset(false);
    if (!settings.data) return;
    const next = SettingsSchema.parse({
      ...settings.data,
      numbering: {
        ...settings.data.numbering,
        counter: 0,
      },
    });
    await setSettings.mutateAsync(next);
    setCounterText("0");
    toast.show({ message: "Counter reset.", variant: "info" });
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Numbering</Text>
      <Text className="mt-1 text-caption text-muted">
        Auto mode formats numbers as {preview}. Counter increments on each
        Save & Send. Custom format strings (year tokens etc.) ship later.
      </Text>
      <View className="mt-4 gap-3">
        <Input
          label="Prefix"
          value={prefix}
          onChangeText={setPrefix}
          placeholder="INV-"
          autoCapitalize="characters"
        />
        <NumberInput
          label="Pad width (3–6)"
          value={minDigitsText}
          onChangeText={setMinDigitsText}
          placeholder="4"
        />
        <NumberInput
          label="Next counter starts after"
          value={counterText}
          onChangeText={setCounterText}
          placeholder="0"
        />
        <Text className="text-caption text-muted">
          Next number: {preview}
        </Text>
        <View className="flex-row gap-2">
          <Button
            label={succeeded ? "✓ Saved" : setSettings.isPending ? "Saving…" : "Save"}
            variant={succeeded ? "success" : "primary"}
            disabled={setSettings.isPending || succeeded}
            onPress={save}
          />
          <Button
            label="Reset counter"
            variant="ghost"
            onPress={() => setConfirmReset(true)}
          />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmReset}
        title="Reset the invoice counter?"
        description="The next invoice will be issued as #1 with your prefix and pad width. Already-issued numbers are not affected."
        confirmLabel="Reset"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={performReset}
      />
    </Card>
  );
}
