import { Text, View } from "react-native";
import { cn } from "@/src/lib/cn";

type Props = {
  steps: string[];
  currentIndex: number;
};

export function Stepper({ steps, currentIndex }: Props) {
  return (
    <View className="flex-row items-center gap-2">
      {steps.map((label, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        return (
          <View key={label} className="flex-row items-center gap-2">
            <View
              className={cn(
                "h-7 w-7 items-center justify-center rounded-full border",
                done ? "border-accent bg-accent" : active ? "border-accent" : "border-border",
              )}
            >
              <Text
                className={cn(
                  "text-label",
                  done ? "text-white" : active ? "text-accent" : "text-muted",
                )}
              >
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 ? (
              <View className={cn("h-px w-6", done ? "bg-accent" : "bg-border")} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
