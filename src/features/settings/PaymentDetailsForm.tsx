import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text, View } from "react-native";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useToast } from "@/src/components/ui/Toast";
import {
  PaymentDetailsSchema,
  SettingsSchema,
  type PaymentDetails,
} from "@/src/types/schemas";
import {
  useSettings,
  useSetSettings,
} from "@/src/features/settings/queries";

export function PaymentDetailsForm() {
  const settings = useSettings();
  const setSettings = useSetSettings();
  const toast = useToast();

  const { control, handleSubmit, reset, formState } = useForm<PaymentDetails>({
    resolver: zodResolver(PaymentDetailsSchema),
    defaultValues: {
      bsb: "",
      accName: "",
      accNumber: "",
      payId: "",
      otherNotes: "",
    },
  });

  useEffect(() => {
    if (settings.data?.paymentDetails) {
      reset(settings.data.paymentDetails);
    }
  }, [settings.data, reset]);

  async function onSubmit(values: PaymentDetails) {
    if (!settings.data) return;
    const next = SettingsSchema.parse({
      ...settings.data,
      paymentDetails: values,
    });
    try {
      await setSettings.mutateAsync(next);
      toast.show({ message: "Payment details saved.", variant: "success" });
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
      <Text className="text-h2 text-foreground">Payment details</Text>
      <Text className="mt-1 text-caption text-muted">
        Embedded on every invoice. Leave fields blank to omit them.
      </Text>
      <View className="mt-4 gap-3">
        <Controller
          control={control}
          name="bsb"
          render={({ field }) => (
            <Input
              label="BSB"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="063-123"
            />
          )}
        />
        <Controller
          control={control}
          name="accNumber"
          render={({ field }) => (
            <Input
              label="Account number"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="accName"
          render={({ field }) => (
            <Input
              label="Account name"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="payId"
          render={({ field }) => (
            <Input
              label="PayID"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="email or phone"
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="otherNotes"
          render={({ field }) => (
            <Input
              label="Other notes"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Stripe link, crypto address, etc."
              multiline
            />
          )}
        />
        <Button
          label={setSettings.isPending ? "Saving…" : "Save payment details"}
          disabled={setSettings.isPending || !formState.isDirty}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Card>
  );
}
