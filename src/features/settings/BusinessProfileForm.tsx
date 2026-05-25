import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Text, View } from "react-native";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useToast } from "@/src/components/ui/Toast";
import { isValidAbn } from "@/src/lib/abn";
import {
  ProfileSchema,
  type Profile,
} from "@/src/types/schemas";
import { useProfile, useSetProfile } from "@/src/features/settings/queries";
import { useSuccessButton } from "@/lib/useSuccessButton";

const BusinessSchema = ProfileSchema.extend({
  abn: z.string().refine((v) => v === "" || isValidAbn(v), {
    message: "ABN must be 11 digits with a valid checksum",
  }),
});

type BusinessForm = z.infer<typeof BusinessSchema>;

function formatAustralianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("04") && digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (digits.startsWith("61") && digits.length === 11) {
    return `+61 ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

export function BusinessProfileForm() {
  const profile = useProfile();
  const setProfile = useSetProfile();
  const toast = useToast();
  const { succeeded, triggerSuccess } = useSuccessButton();

  const { control, handleSubmit, reset } = useForm<BusinessForm>({
    resolver: zodResolver(BusinessSchema),
    defaultValues: {
      businessName: "",
      abn: "",
      address: "",
      email: "",
      phone: "",
      gstRegistered: true,
    },
  });

  useEffect(() => {
    if (profile.data) {
      reset(profile.data);
    }
  }, [profile.data, reset]);

  async function onSubmit(values: BusinessForm) {
    try {
      const next: Profile = ProfileSchema.parse(values);
      await setProfile.mutateAsync(next);
      triggerSuccess();
    } catch (err) {
      console.error(err);
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save profile.",
        variant: "error",
      });
    }
  }

  return (
    <Card>
      <Text className="text-h2 text-foreground">Business profile</Text>
      <Text className="mt-1 text-caption text-muted">
        Appears on every invoice. Required for ATO-compliant tax invoices.
      </Text>
      <View className="mt-4 gap-2">
        <Controller
          control={control}
          name="businessName"
          render={({ field, fieldState }) => (
            <Input
              label="Business name"
              required
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              placeholder="Acme Pty Ltd"
            />
          )}
        />
        <Controller
          control={control}
          name="abn"
          render={({ field, fieldState }) => (
            <Input
              label="ABN"
              required
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              placeholder="11 digits"
              keyboardType="number-pad"
              maxLength={14}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field, fieldState }) => (
            <Input
              label="Address"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              placeholder="Street, suburb, state, postcode"
              multiline
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Input
              label="Phone"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onChange(formatAustralianPhone(field.value ?? ""));
                field.onBlur();
              }}
              error={fieldState.error?.message ?? null}
              keyboardType="phone-pad"
            />
          )}
        />
        <Button
          label={succeeded ? "✓ Saved" : setProfile.isPending ? "Saving…" : "Save changes"}
          variant={succeeded ? "success" : "primary"}
          disabled={setProfile.isPending || succeeded}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Card>
  );
}
