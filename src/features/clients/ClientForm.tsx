import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { View } from "react-native";
import { z } from "zod";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button, type ButtonVariant } from "@/src/components/ui/Button";
import { ClientInputSchema, type Client, type ClientInput } from "@/src/types/schemas";
import { isValidAbn } from "@/src/lib/abn";

const FormSchema = ClientInputSchema.extend({
  abn: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || isValidAbn(v), {
      message: "ABN must be 11 digits with a valid checksum",
    }),
});

type FormValues = z.infer<typeof FormSchema>;

type Props = {
  initial?: Client;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  onSubmit: (values: ClientInput) => Promise<void>;
};

export function ClientForm({ initial, submitLabel, submitVariant = "primary", onSubmit }: Props) {
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      abn: initial?.abn ?? "",
      notes: initial?.notes ?? "",
    },
  });

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        email: initial.email ?? "",
        address: initial.address ?? "",
        abn: initial.abn ?? "",
        notes: initial.notes ?? "",
      });
    }
  }, [initial, reset]);

  return (
    <Card>
      <View className="gap-3">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Name"
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
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label="Email"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="abn"
          render={({ field, fieldState }) => (
            <Input
              label="ABN"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
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
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              multiline
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <Input
              label="Notes"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? null}
              multiline
            />
          )}
        />
        <Button
          label={submitLabel}
          variant={submitVariant}
          disabled={(!formState.isValid && formState.isSubmitted) || submitVariant === "success"}
          onPress={handleSubmit((v) => onSubmit(v as ClientInput))}
        />
      </View>
    </Card>
  );
}
