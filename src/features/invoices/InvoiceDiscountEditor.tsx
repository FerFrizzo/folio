import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { NumberInput } from "@/src/components/ui/NumberInput";
import type { CurrencyCode, Discount } from "@/src/types/schemas";

type Props = {
  currency: CurrencyCode;
  value: Discount | undefined;
  onChange: (next: Discount | undefined) => void;
};

export function InvoiceDiscountEditor({ currency, value, onChange }: Props) {
  const [pctText, setPctText] = useState(
    value?.type === "pct" ? (value.value / 100).toString() : "",
  );
  const [fixedText, setFixedText] = useState(
    value?.type === "fixed" ? (value.value / 100).toFixed(2) : "",
  );

  return (
    <View className="gap-2">
      <Text className="text-label text-foreground">Whole-invoice discount</Text>
      <View className="flex-row gap-2">
        {(["none", "pct", "fixed"] as const).map((opt) => {
          const active =
            (opt === "none" && !value) || (value && opt === value.type);
          return (
            <Pressable
              key={opt}
              onPress={() => {
                if (opt === "none") {
                  onChange(undefined);
                  setPctText("");
                  setFixedText("");
                } else if (opt === "pct") {
                  onChange({ type: "pct", value: Math.round(Number(pctText || "0") * 100) });
                } else {
                  onChange({ type: "fixed", value: Math.round(Number(fixedText || "0") * 100) });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Whole-invoice discount: ${opt}`}
              className={
                active
                  ? "rounded-chip border border-accent bg-accent px-3 py-1"
                  : "rounded-chip border border-border bg-surface px-3 py-1"
              }
            >
              <Text
                className={
                  active ? "text-label text-white" : "text-label text-foreground"
                }
              >
                {opt === "none" ? "None" : opt === "pct" ? "Percent" : "Fixed"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value?.type === "pct" ? (
        <NumberInput
          label="Percent (0–100)"
          value={pctText}
          onChangeText={(v) => {
            setPctText(v);
            onChange({ type: "pct", value: Math.round(Number(v || "0") * 100) });
          }}
          placeholder="10"
        />
      ) : null}
      {value?.type === "fixed" ? (
        <CurrencyInput
          label="Amount off"
          value={fixedText}
          onChangeText={(v) => {
            setFixedText(v);
            onChange({ type: "fixed", value: Math.round(Number(v || "0") * 100) });
          }}
          symbol={currency === "AUD" ? "$" : currency}
        />
      ) : null}
    </View>
  );
}
