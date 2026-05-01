import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { IconButton } from "@/src/components/ui/IconButton";
import { formatMoney } from "@/src/lib/money";
import type { CurrencyCode } from "@/src/types/schemas";

// Editor's per-line input shape. Strings used for numeric fields so the user
// can type partial values ("1.", "0.0", etc.) without the input fighting them.
export type LineItemInput = {
  description: string;
  qty: string;          // decimal string
  unitPriceText: string; // dollars-and-cents string, e.g. "120.00"
  gstRate: number;      // 0.10 default
};

type Props = {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  currency: CurrencyCode;
  computedLineTotalsCents: number[]; // parallel to items
};

export function ItemsSection({ items, onChange, currency, computedLineTotalsCents }: Props) {
  const [showTaxFor, setShowTaxFor] = useState<number | null>(null);

  function update(index: number, patch: Partial<LineItemInput>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function add() {
    onChange([
      ...items,
      { description: "", qty: "1", unitPriceText: "", gstRate: 0.1 },
    ]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-4">
      {items.length === 0 ? (
        <Text className="text-caption text-muted">
          Add at least one line item to send this invoice.
        </Text>
      ) : null}

      {items.map((item, index) => (
        <View key={index} className="gap-3 rounded-card border border-border bg-background p-3">
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <Input
                label="Description"
                value={item.description}
                onChangeText={(v) => update(index, { description: v })}
                placeholder="What did you do?"
              />
            </View>
            <View className="pt-6">
              <IconButton
                icon={Trash2}
                accessibilityLabel="Remove line"
                tone="danger"
                onPress={() => remove(index)}
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <NumberInput
                label="Qty"
                value={item.qty}
                onChangeText={(v) => update(index, { qty: v })}
                placeholder="1"
              />
            </View>
            <View className="flex-[2]">
              <CurrencyInput
                label="Unit price"
                value={item.unitPriceText}
                onChangeText={(v) => update(index, { unitPriceText: v })}
              />
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setShowTaxFor(showTaxFor === index ? null : index)}
              accessibilityRole="button"
              accessibilityLabel="Adjust GST for this line"
            >
              <Text className="text-caption font-semibold text-accent">
                Tax · {(item.gstRate * 100).toFixed(0)}%
              </Text>
            </Pressable>
            <Text className="text-body font-semibold text-foreground [font-feature-settings:'tnum']">
              {formatMoney(computedLineTotalsCents[index] ?? 0, currency)}
            </Text>
          </View>
          {showTaxFor === index ? (
            <View className="mt-1 flex-row gap-2">
              {[0, 0.1].map((rate) => (
                <Pressable
                  key={rate}
                  onPress={() => {
                    update(index, { gstRate: rate });
                    setShowTaxFor(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Set GST to ${rate * 100}%`}
                  className={
                    item.gstRate === rate
                      ? "rounded-chip border border-accent bg-accent px-3 py-1"
                      : "rounded-chip border border-border bg-surface px-3 py-1"
                  }
                >
                  <Text
                    className={
                      item.gstRate === rate
                        ? "text-label text-white"
                        : "text-label text-foreground"
                    }
                  >
                    {rate === 0 ? "GST-free" : `${rate * 100}% GST`}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={add}
        accessibilityRole="button"
        accessibilityLabel="Add line item"
        className="flex-row items-center justify-center gap-2 rounded-button border border-dashed border-accent py-3"
      >
        <Plus size={16} color="#0B3D5C" />
        <Text className="text-body font-semibold text-accent">Add line item</Text>
      </Pressable>
    </View>
  );
}
