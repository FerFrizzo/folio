import { Text, View } from "react-native";
import { Button } from "@/src/components/ui/Button";

type Props = {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function EmptyState({ title, description, ctaLabel, onCtaPress }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="mb-2 text-h2 text-foreground">{title}</Text>
      {description ? (
        <Text className="mb-6 text-center text-body text-muted">{description}</Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <Button label={ctaLabel} onPress={onCtaPress} />
      ) : null}
    </View>
  );
}
