import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Card } from "@/src/components/ui/Card";

type Props = {
  title: string;
  defaultExpanded?: boolean;
  hasError?: boolean;
  children: ReactNode;
};

export function CollapsibleCard({ title, defaultExpanded = false, hasError, children }: Props) {
  const [open, setOpen] = useState(defaultExpanded || hasError);

  return (
    <Card className="p-0">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${title} ${open ? "(expanded)" : "(collapsed)"}`}
        className="flex-row items-center justify-between p-4"
      >
        <Text className="text-h2 text-foreground">{title}</Text>
        {open ? (
          <ChevronUp size={20} color="#4B5563" />
        ) : (
          <ChevronDown size={20} color="#4B5563" />
        )}
      </Pressable>
      {open ? (
        <View className="border-t border-border p-4">{children}</View>
      ) : null}
    </Card>
  );
}
