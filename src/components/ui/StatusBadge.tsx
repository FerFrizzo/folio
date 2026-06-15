import { Text, View } from "react-native";
import type { StatusKey } from "@/src/theme/colors";
import { Status } from "@/src/theme/colors";

const labels: Record<StatusKey, string> = {
  paid: "Paid",
  sent: "Sent",
  overdue: "Overdue",
  partial: "Partial",
  draft: "Draft",
};

// Status pills: 11 px label, 4/8 px padding, status color at 12% alpha bg +
// full-strength text. Sentence case (no uppercase). Per spec §13.
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Props = {
  status: StatusKey;
  label?: string;
};

export function StatusBadge({ status, label }: Props) {
  const tint = Status[status];
  return (
    <View
      style={{
        backgroundColor: withAlpha(tint, 0.12),
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        alignSelf: "center",
      }}
    >
      <Text style={{ color: tint, fontSize: 13, fontWeight: "600" }}>
        {label ?? labels[status]}
      </Text>
    </View>
  );
}
