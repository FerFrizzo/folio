import { Pressable, Text } from "react-native";
import type { StatusKey } from "@/src/theme/colors";
import { Status } from "@/src/theme/colors";
import { cn } from "@/src/lib/cn";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  status?: StatusKey;
  accessibilityLabel?: string;
};

export function Chip({ label, selected, onPress, status, accessibilityLabel }: Props) {
  const tint = status ? Status[status] : "#0B3D5C";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={
        selected
          ? { backgroundColor: tint, borderColor: tint }
          : undefined
      }
      className={cn(
        "h-9 items-center justify-center rounded-chip border px-3",
        selected ? "" : "border-border bg-surface",
      )}
    >
      <Text
        style={selected ? { color: "#FFFFFF" } : undefined}
        className={cn("text-label", selected ? "" : "text-foreground")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
