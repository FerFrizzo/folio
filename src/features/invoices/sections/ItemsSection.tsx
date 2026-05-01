import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Plus, Trash2, BookmarkPlus, Library } from "lucide-react-native";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { IconButton } from "@/src/components/ui/IconButton";
import { Sheet } from "@/src/components/ui/Sheet";
import { ListRow } from "@/src/components/ui/ListRow";
import { useToast } from "@/src/components/ui/Toast";
import { formatMoney } from "@/src/lib/money";
import type { CurrencyCode, Discount } from "@/src/types/schemas";
import {
  useCreateLibraryEntry,
  useLineItemLibrary,
} from "@/src/features/settings/libraryQueries";

// Editor's per-line input shape. Strings used for numeric fields so the user
// can type partial values ("1.", "0.0", etc.) without the input fighting them.
export type LineItemInput = {
  description: string;
  qty: string;
  unitPriceText: string;
  gstRate: number;
  lineDiscount?: Discount;
};

type Props = {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  currency: CurrencyCode;
  computedLineTotalsCents: number[];
  // Phase 3: when currency !== AUD all lines forced GST-free.
  exportMode: boolean;
};

function pctToBp(pct: string): number {
  const n = Number(pct);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100); // 10% → 1000 basis points
}

export function ItemsSection({
  items,
  onChange,
  currency,
  computedLineTotalsCents,
  exportMode,
}: Props) {
  const [taxFor, setTaxFor] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const library = useLineItemLibrary();
  const createLibraryEntry = useCreateLibraryEntry();
  const toast = useToast();

  function update(index: number, patch: Partial<LineItemInput>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function add() {
    onChange([
      ...items,
      {
        description: "",
        qty: "1",
        unitPriceText: "",
        gstRate: exportMode ? 0 : 0.1,
      },
    ]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  async function saveToLibrary(index: number) {
    const item = items[index];
    if (!item || !item.description.trim()) {
      toast.show({ message: "Add a description first.", variant: "error" });
      return;
    }
    const unitPriceCents = Math.round(Number(item.unitPriceText) * 100) || 0;
    const qty = Number(item.qty) || 1;
    try {
      await createLibraryEntry.mutateAsync({
        description: item.description.trim(),
        defaultQty: qty,
        unitPriceCents,
        gstRate: item.gstRate,
      });
      toast.show({ message: "Saved to library.", variant: "success" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't save.",
        variant: "error",
      });
    }
  }

  function insertFromLibrary(entry: {
    description: string;
    defaultQty: number;
    unitPriceCents: number;
    gstRate: number;
  }) {
    onChange([
      ...items,
      {
        description: entry.description,
        qty: String(entry.defaultQty),
        unitPriceText: (entry.unitPriceCents / 100).toFixed(2),
        gstRate: exportMode ? 0 : entry.gstRate,
      },
    ]);
    setLibraryOpen(false);
  }

  return (
    <View className="gap-4">
      {items.length === 0 ? (
        <Text className="text-caption text-muted">
          Add at least one line item to send this invoice.
        </Text>
      ) : null}

      {items.map((item, index) => {
        const taxOpen = taxFor === index;
        return (
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
                onPress={() => setTaxFor(taxOpen ? null : index)}
                accessibilityRole="button"
                accessibilityLabel="Tax and discount options"
              >
                <Text className="text-caption font-semibold text-accent">
                  Tax · {(item.gstRate * 100).toFixed(0)}%
                  {item.lineDiscount ? " · Discounted" : ""}
                </Text>
              </Pressable>
              <Text className="text-body font-semibold text-foreground [font-feature-settings:'tnum']">
                {formatMoney(computedLineTotalsCents[index] ?? 0, currency)}
              </Text>
            </View>
            {taxOpen ? (
              <View className="mt-1 gap-3 border-t border-border pt-3">
                {!exportMode ? (
                  <View className="flex-row gap-2">
                    {[0, 0.1].map((rate) => (
                      <Pressable
                        key={rate}
                        onPress={() => update(index, { gstRate: rate })}
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
                <LineDiscountEditor
                  value={item.lineDiscount}
                  currency={currency}
                  onChange={(d) =>
                    update(index, d ? { lineDiscount: d } : { lineDiscount: undefined })
                  }
                />
                <Pressable
                  onPress={() => saveToLibrary(index)}
                  accessibilityRole="button"
                  accessibilityLabel="Save line to library"
                  className="flex-row items-center gap-2"
                >
                  <BookmarkPlus size={14} color="#0B3D5C" />
                  <Text className="text-label font-semibold text-accent">
                    Save to library
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <View className="flex-row gap-2">
        <Pressable
          onPress={add}
          accessibilityRole="button"
          accessibilityLabel="Add line item"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-button border border-dashed border-accent py-3"
        >
          <Plus size={16} color="#0B3D5C" />
          <Text className="text-body font-semibold text-accent">Add line</Text>
        </Pressable>
        <Pressable
          onPress={() => setLibraryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Insert from library"
          className="flex-row items-center gap-2 rounded-button border border-border bg-surface px-3"
        >
          <Library size={16} color="#0B3D5C" />
          <Text className="text-body font-semibold text-foreground">Library</Text>
        </Pressable>
      </View>

      <Sheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Insert from library"
      >
        {(library.data ?? []).length === 0 ? (
          <Text className="text-body text-muted">
            No saved lines yet. Save items to your library from the Tax options.
          </Text>
        ) : (
          <View className="max-h-80 overflow-hidden rounded-card border border-border bg-surface">
            {(library.data ?? []).map((entry, idx, arr) => (
              <View key={entry.id}>
                <ListRow
                  primary={entry.description}
                  secondary={`${entry.defaultQty} × ${formatMoney(entry.unitPriceCents, currency)}`}
                  trailingMeta={`${(entry.gstRate * 100).toFixed(0)}% GST`}
                  onPress={() => insertFromLibrary(entry)}
                />
                {idx < arr.length - 1 ? (
                  <View className="h-px bg-border" />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </View>
  );
}

function LineDiscountEditor({
  value,
  onChange,
}: {
  value: Discount | undefined;
  currency: CurrencyCode;
  onChange: (next: Discount | undefined) => void;
}) {
  const [pctText, setPctText] = useState(
    value?.type === "pct" ? (value.value / 100).toString() : "",
  );
  const [fixedText, setFixedText] = useState(
    value?.type === "fixed" ? (value.value / 100).toFixed(2) : "",
  );

  return (
    <View className="gap-2">
      <Text className="text-label text-muted">Line discount</Text>
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
                  const n = pctToBp(pctText || "0");
                  onChange({ type: "pct", value: n });
                } else {
                  const cents = Math.round(Number(fixedText) * 100) || 0;
                  onChange({ type: "fixed", value: cents });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Discount: ${opt}`}
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
            onChange({ type: "pct", value: pctToBp(v) });
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
            onChange({ type: "fixed", value: Math.round(Number(v) * 100) || 0 });
          }}
        />
      ) : null}
    </View>
  );
}
