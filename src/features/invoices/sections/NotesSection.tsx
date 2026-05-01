import { TextInput, View } from "react-native";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function NotesSection({ value, onChange }: Props) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={4}
        placeholder="Anything you want the client to see — terms, thanks, etc."
        placeholderTextColor="#9CA3AF"
        className="min-h-[96px] rounded-button border border-border bg-surface px-3 py-2 text-body text-foreground"
        accessibilityLabel="Invoice notes"
      />
    </View>
  );
}
