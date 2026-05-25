import { Pressable, Text, type PressableProps } from "react-native";
import { cn } from "@/src/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  onPress?: PressableProps["onPress"];
  accessibilityLabel?: string;
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-5",
};

const labelSizeClasses: Record<ButtonSize, string> = {
  sm: "text-label",
  md: "text-body",
  lg: "text-body",
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  disabled,
  className,
  onPress,
  accessibilityLabel,
}: Props) {
  const bg = {
    primary: "bg-accent active:bg-accent-hover",
    secondary: "bg-surface border border-border active:bg-background",
    ghost: "bg-transparent active:bg-background",
    danger: "bg-status-overdue active:opacity-90",
    success: "bg-status-paid active:opacity-90",
  }[variant];

  const text = {
    primary: "text-white",
    secondary: "text-foreground",
    ghost: "text-accent",
    danger: "text-white",
    success: "text-white",
  }[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      className={cn(
        "items-center justify-center rounded-button",
        sizeClasses[size],
        bg,
        disabled ? "opacity-40" : "",
        className,
      )}
    >
      <Text className={cn("font-semibold", labelSizeClasses[size], text)}>{label}</Text>
    </Pressable>
  );
}
