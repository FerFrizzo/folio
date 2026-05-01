import { Platform, Pressable, Text, View } from "react-native";
import { cn } from "@/src/lib/cn";

// Phase 1: simple text-display-only date "input". On web we render a real
// <input type="date">. On native a tappable surface — the actual native picker
// will be wired in Phase 2 once a screen needs it. Per spec §13, native uses
// the platform date picker; web uses <input type="date">.

type Props = {
  label?: string;
  required?: boolean;
  error?: string | null;
  value: string; // ISO YYYY-MM-DD
  onChange: (next: string) => void;
  placeholder?: string;
};

export function DateInput({ label, required, error, value, onChange, placeholder = "YYYY-MM-DD" }: Props) {
  return (
    <View className="gap-1">
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? <View className="h-1 w-1 rounded-full bg-accent" /> : null}
        </View>
      ) : null}
      {Platform.OS === "web" ? (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 rounded-md border bg-white px-3 text-[15px] text-[#111827] outline-none",
            error ? "border-[#C0392B]" : "border-[#E5E5E0]",
          )}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ?? "Select date"}
          className={cn(
            "h-11 justify-center rounded-button border bg-surface px-3",
            error ? "border-status-overdue" : "border-border",
          )}
        >
          <Text className={cn("text-body", value ? "text-foreground" : "text-muted")}>
            {value || placeholder}
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text className="text-caption text-status-overdue">{error}</Text>
      ) : null}
    </View>
  );
}
