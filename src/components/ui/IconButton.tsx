import { Pressable, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { cn } from "@/src/lib/cn";

type Props = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress?: PressableProps["onPress"];
  size?: number;
  variant?: "ghost" | "filled";
  disabled?: boolean;
  className?: string;
  tone?: "default" | "danger";
};

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  size = 22,
  variant = "ghost",
  disabled,
  className,
  tone = "default",
}: Props) {
  const bg =
    variant === "filled" ? "bg-surface border border-border" : "bg-transparent active:bg-background";
  const color =
    tone === "danger" ? "#C0392B" : variant === "filled" ? "#1473FF" : undefined;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-button",
        bg,
        disabled ? "opacity-40" : "",
        className,
      )}
    >
      <Icon size={size} color={color ?? "#1473FF"} />
    </Pressable>
  );
}
