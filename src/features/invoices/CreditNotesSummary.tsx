import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { formatMoney } from "@/src/lib/money";
import type { CreditNote, CurrencyCode } from "@/src/types/schemas";

type Props = {
  creditNotes: CreditNote[];
  currency: CurrencyCode;
  netBalanceCents: number;
};

// Linked credit notes + net balance (spec §7). Each row opens the credit note,
// where it can be re-shared or archived (e.g. a duplicate issued by mistake).
export function CreditNotesSummary({ creditNotes, currency, netBalanceCents }: Props) {
  const router = useRouter();
  if (creditNotes.length === 0) return null;

  return (
    <View className="mt-3 border-t border-border pt-3">
      <Text className="text-caption text-muted">Credit notes</Text>
      <View className="mt-1">
        {creditNotes.map((cn) => (
          <Pressable
            key={cn.id}
            accessibilityRole="button"
            accessibilityLabel={`Open credit note ${cn.number}`}
            onPress={() =>
              router.push({ pathname: "/credit-notes/[id]", params: { id: cn.id } })
            }
            className="flex-row items-center justify-between py-2"
          >
            <Text className="text-body text-accent">{cn.number}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-body text-foreground [font-feature-settings:'tnum']">
                {formatMoney(cn.totalCents, currency)}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </Pressable>
        ))}
      </View>
      <Text className="mt-1 text-body font-semibold text-foreground [font-feature-settings:'tnum']">
        Net balance: {formatMoney(netBalanceCents, currency)}
      </Text>
    </View>
  );
}
