import { Switch as RNSwitch, Text, View } from "react-native";

type Props = {
  label?: string;
  helperText?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function Switch({ label, helperText, value, onValueChange, disabled }: Props) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1">
        {label ? <Text className="text-body text-foreground">{label}</Text> : null}
        {helperText ? (
          <Text className="text-caption text-muted">{helperText}</Text>
        ) : null}
      </View>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E5E5E0", true: "#1473FF" }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label ?? "Toggle"}
      />
    </View>
  );
}
