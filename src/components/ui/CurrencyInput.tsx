import { useCallback } from "react";
import { Text, TextInput, View } from "react-native";
import { cn } from "@/src/lib/cn";

type Props = {
  label?: string;
  error?: string | null;
  required?: boolean;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  symbol?: string;
};

const NUMERIC_RE = /^\d*(?:\.\d{0,2})?$/;

export function CurrencyInput({
  label,
  error,
  required,
  value,
  onChangeText,
  placeholder = "0.00",
  symbol = "$",
}: Props) {
  const handleChange = useCallback(
    (raw: string) => {
      if (raw === "") return onChangeText("");
      if (!NUMERIC_RE.test(raw)) return;
      onChangeText(raw);
    },
    [onChangeText],
  );

  return (
    <View className="gap-1">
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? <View className="h-1 w-1 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
      <View
        className={cn(
          "h-11 flex-row items-center rounded-button border bg-surface px-3",
          error ? "border-status-overdue" : "border-border",
        )}
      >
        <Text className="text-body text-muted">{symbol}</Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="ml-1 flex-1 text-right text-body text-foreground [font-feature-settings:'tnum']"
        />
      </View>
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}
    </View>
  );
}
