import { forwardRef } from "react";
import {
  TextInput,
  Text,
  View,
  type TextInputProps,
} from "react-native";
import { cn } from "@/src/lib/cn";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  required?: boolean;
  containerClassName?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, required, containerClassName, className, ...rest },
  ref,
) {
  return (
    <View className={cn("gap-1", containerClassName)}>
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? <View className="h-1 w-1 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#9CA3AF"
        className={cn(
          "h-11 rounded-button border bg-surface px-3 text-body text-foreground",
          error ? "border-status-overdue" : "border-border",
          className,
        )}
        {...rest}
      />
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}
    </View>
  );
});
