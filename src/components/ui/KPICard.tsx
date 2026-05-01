import { Text } from "react-native";
import type { StatusKey } from "@/src/theme/colors";
import { Status } from "@/src/theme/colors";
import { Card } from "@/src/components/ui/Card";

type Props = {
  label: string;
  amount: string;
  helperText?: string;
  emphasis?: "default" | "large";
  tone?: StatusKey;
};

export function KPICard({ label, amount, helperText, emphasis = "default", tone }: Props) {
  const amountColor = tone ? { color: Status[tone] } : undefined;
  return (
    <Card>
      <Text className="text-label text-muted">{label}</Text>
      <Text
        style={amountColor}
        className={
          emphasis === "large"
            ? "mt-1 text-display font-bold text-foreground [font-feature-settings:'tnum']"
            : "mt-1 text-h1 font-semibold text-foreground [font-feature-settings:'tnum']"
        }
      >
        {amount}
      </Text>
      {helperText ? (
        <Text className="mt-1 text-caption text-muted">{helperText}</Text>
      ) : null}
    </Card>
  );
}
