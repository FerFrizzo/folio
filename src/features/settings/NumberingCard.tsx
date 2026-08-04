import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { Button } from "@/src/components/ui/Button";
import { Switch } from "@/src/components/ui/Switch";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/ui/Toast";
import { suggestNextInvoiceNumber } from "@/src/lib/numbering";
import {
  useInvoiceCounter,
  useSetInvoiceCounter,
  useSettings,
  useSetSettings,
} from "@/src/features/settings/queries";
import { SettingsSchema } from "@/src/types/schemas";
import { useSuccessButton } from "@/lib/useSuccessButton";
import { errorMessage } from "@/src/lib/zod-message";

export function NumberingCard() {
  const settings = useSettings();
  const setSettings = useSetSettings();
  // The live allocation counter. settings.numbering.counter is a legacy field
  // that nothing in the allocation path reads — see counters.ts.
  const invoiceCounter = useInvoiceCounter();
  const setInvoiceCounter = useSetInvoiceCounter();
  const toast = useToast();
  const { succeeded, triggerSuccess } = useSuccessButton();

  const [prefix, setPrefix] = useState("INV-");
  const [minDigitsText, setMinDigitsText] = useState("4");
  const [counterText, setCounterText] = useState("0");
  const [allowManualNumber, setAllowManualNumber] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setPrefix(settings.data.numbering.prefix);
    setMinDigitsText(String(settings.data.numbering.minDigits));
    setAllowManualNumber(settings.data.numbering.allowManualNumber);
  }, [settings.data]);

  useEffect(() => {
    if (invoiceCounter.data === undefined) return;
    setCounterText(String(invoiceCounter.data));
  }, [invoiceCounter.data]);

  const minDigitsParsed = Math.max(3, Math.min(6, Number(minDigitsText) || 4));
  const counterParsed = Math.max(0, Math.floor(Number(counterText) || 0));

  const preview = suggestNextInvoiceNumber({
    prefix,
    counter: counterParsed,
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
          allowManualNumber,
        },
      });
      await setSettings.mutateAsync(next);
      await setInvoiceCounter.mutateAsync(counterParsed);
      triggerSuccess();
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't save."),
        variant: "error",
      });
    }
  }

  async function performReset() {
    setConfirmReset(false);
    try {
      await setInvoiceCounter.mutateAsync(0);
      setCounterText("0");
      toast.show({ message: "Counter reset.", variant: "info" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't reset."),
        variant: "error",
      });
    }
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
        <Switch
          label="Allow editing invoice numbers"
          helperText="Type or correct an invoice's number instead of using the auto counter. Off keeps numbers read-only."
          value={allowManualNumber}
          onValueChange={setAllowManualNumber}
        />
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
