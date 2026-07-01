import { Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import { useSettings, useSetSettings } from "@/src/features/settings/queries";
import { SettingsSchema } from "@/src/types/schemas";

export function InvoiceDefaultsCard() {
  const settings = useSettings();
  const setSettings = useSetSettings();
  const toast = useToast();

  const applyGst = (settings.data?.defaultGstRate ?? 0.1) > 0;

  async function setApplyGst(next: boolean) {
    if (!settings.data) return;
    try {
      const updated = SettingsSchema.parse({
        ...settings.data,
        defaultGstRate: next ? 0.1 : 0,
      });
      await setSettings.mutateAsync(updated);
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save.",
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Invoice defaults</Text>
      <View className="mt-3">
        <Switch
          label="Apply GST to new items"
          helperText="New line items start at 10% GST. Turn off to default them to GST-free."
          value={applyGst}
          onValueChange={setApplyGst}
          disabled={!settings.data || setSettings.isPending}
        />
      </View>
    </Card>
  );
}
