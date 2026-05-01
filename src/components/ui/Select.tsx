import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { cn } from "@/src/lib/cn";

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
};

type Props<V extends string> = {
  label?: string;
  required?: boolean;
  error?: string | null;
  value: V | null;
  onChange: (next: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
};

export function Select<V extends string>({
  label,
  required,
  error,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View className="gap-1">
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? <View className="h-1 w-1 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? "Open select"}
        onPress={() => setOpen((v) => !v)}
        className={cn(
          "h-11 flex-row items-center justify-between rounded-button border bg-surface px-3",
          error ? "border-status-overdue" : "border-border",
        )}
      >
        <Text className={cn("text-body", current ? "text-foreground" : "text-muted")}>
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color="#4B5563" />
      </Pressable>
      {open ? (
        <View className="mt-1 overflow-hidden rounded-card border border-border bg-surface">
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="h-11 flex-row items-center justify-between px-3 active:bg-background"
              >
                <Text
                  className={cn(
                    "text-body",
                    selected ? "font-semibold text-accent" : "text-foreground",
                  )}
                >
                  {opt.label}
                </Text>
                {selected ? <Check size={16} color="#0B3D5C" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}
    </View>
  );
}
