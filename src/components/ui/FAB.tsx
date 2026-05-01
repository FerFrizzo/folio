import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, type LucideIcon } from "lucide-react-native";

type Props = {
  icon?: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  bottomOffset?: number;
};

// FAB is mobile-only per spec §13. Web uses a primary header button instead;
// this component bails out on web so callers can render unconditionally.
export function FAB({ icon: Icon = Plus, onPress, accessibilityLabel, bottomOffset = 16 }: Props) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 right-0"
      style={{ paddingBottom: insets.bottom + bottomOffset, paddingRight: 16 }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className="h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg active:bg-accent-hover"
      >
        <Icon size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
