import { View, type ViewProps } from "react-native";
import { cn } from "@/src/lib/cn";

type Props = ViewProps & {
  className?: string;
};

export function Card({ className, children, ...rest }: Props) {
  return (
    <View
      className={cn(
        "rounded-card border border-border bg-surface p-4",
        // Subtle shadow in light mode only — borders carry weight in dark mode.
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none",
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
