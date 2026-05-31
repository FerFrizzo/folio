import { forwardRef, type ReactNode } from "react";
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
  rightElement?: ReactNode;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, required, containerClassName, className, rightElement, ...rest },
  ref,
) {
  const borderClass = error ? "border-status-overdue" : "border-border";

  return (
    <View className={cn("gap-1", containerClassName)}>
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? <View className="h-1 w-1 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
      {rightElement != null ? (
        <View
          className={cn(
            "h-11 flex-row items-center rounded-button border bg-surface px-3",
            borderClass,
          )}
        >
          <TextInput
            ref={ref}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="center"
            className={cn("flex-1 py-0 text-body text-foreground", className)}
            {...rest}
          />
          {rightElement}
        </View>
      ) : (
        <TextInput
          ref={ref}
          placeholderTextColor="#9CA3AF"
          textAlignVertical="center"
          className={cn(
            "h-11 rounded-button border bg-surface px-3 py-0 text-body text-foreground",
            borderClass,
            className,
          )}
          {...rest}
        />
      )}
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}
    </View>
  );
});
