import { Pressable, Text, View } from "react-native";
import type { StatusKey } from "@/src/theme/colors";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { cn } from "@/src/lib/cn";

type Props = {
  primary: string;
  secondary?: string;
  trailingAmount?: string;
  trailingMeta?: string;
  status?: StatusKey;
  overdue?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
};

// Two-line invoice row per spec §13:
//   number                       $1,320.00
//   client            Due in 3 days  [Sent]
// Tabular numerals on totals so columns align. Overdue rows get a 3 px left
// stripe in --overdue.
export function ListRow({
  primary,
  secondary,
  trailingAmount,
  trailingMeta,
  status,
  overdue,
  onPress,
  onLongPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? primary}
      className={cn(
        "flex-row items-center bg-surface px-4 py-3 active:bg-background",
      )}
    >
      {overdue ? (
        <View className="absolute left-0 top-0 h-full w-[3px] bg-status-overdue" />
      ) : null}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-body font-semibold text-foreground" numberOfLines={1}>
            {primary}
          </Text>
          {trailingAmount ? (
            <Text className="text-body font-semibold text-foreground [font-feature-settings:'tnum']">
              {trailingAmount}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-caption text-muted" numberOfLines={1}>
            {secondary ?? ""}
          </Text>
          <View className="flex-row items-center gap-2">
            {trailingMeta ? (
              <Text className="text-caption text-muted">{trailingMeta}</Text>
            ) : null}
            {status ? <StatusBadge status={status} /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
