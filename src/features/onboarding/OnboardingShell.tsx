import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { Stepper } from "@/src/components/ui/Stepper";

const STEPS = ["Profile", "Logo", "Payment", "Pro"];

type Props = {
  stepIndex: 0 | 1 | 2 | 3;
  title: string;
  description: string;
  children: ReactNode;
};

export function OnboardingShell({ stepIndex, title, description, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
        gap: 16,
      }}
    >
      <Stepper steps={STEPS} currentIndex={stepIndex} />
      <View>
        <Text className="text-h1 text-foreground">{title}</Text>
        <Text className="mt-1 text-body text-muted">{description}</Text>
      </View>
      {children}
    </ScrollView>
  );
}
