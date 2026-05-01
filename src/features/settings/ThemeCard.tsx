import { Pressable, Text, View } from "react-native";
import { Card } from "@/src/components/ui/Card";
import { useThemeStore } from "@/src/features/settings/themeStore";
import { cn } from "@/src/lib/cn";

const OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function ThemeCard() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <Card>
      <Text className="text-h2 text-foreground">Theme</Text>
      <Text className="mt-1 text-caption text-muted">
        System follows your device. Override here to force light or dark.
      </Text>
      <View className="mt-4 flex-row gap-2">
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setMode(o.value)}
              accessibilityRole="button"
              accessibilityLabel={`${o.label} theme`}
              accessibilityState={{ selected: active }}
              className={cn(
                "h-10 flex-1 items-center justify-center rounded-button border",
                active ? "border-accent bg-accent" : "border-border bg-surface",
              )}
            >
              <Text
                className={cn(
                  "text-label",
                  active ? "text-white" : "text-foreground",
                )}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
