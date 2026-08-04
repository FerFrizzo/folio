import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Plus, Trash2, BookmarkPlus, Library } from "lucide-react-native";
import { Input } from "@/src/components/ui/Input";
import { NumberInput } from "@/src/components/ui/NumberInput";
import { CurrencyInput } from "@/src/components/ui/CurrencyInput";
import { IconButton } from "@/src/components/ui/IconButton";
import { Sheet } from "@/src/components/ui/Sheet";
import { ListRow } from "@/src/components/ui/ListRow";
import { useToast } from "@/src/components/ui/Toast";
import { readLibraryEntryInput } from "@/src/lib/library-entry";
import { errorMessage } from "@/src/lib/zod-message";
import { formatMoney } from "@/src/lib/money";
import type { CurrencyCode, Discount } from "@/src/types/schemas";
import {
  useCreateLibraryEntry,
  useDeleteLibraryEntry,
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
  // Default GST rate applied to newly-added lines (from user settings).
  defaultGstRate: number;
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
  defaultGstRate,
}: Props) {
  const [taxFor, setTaxFor] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Id of the library row currently asking "remove?". Inline rather than a
  // ConfirmDialog because Sheet is already a Modal and nesting Modals is
  // unreliable on iOS.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Whether the armed row's delete attempt failed. Surfaced inline (see
  // confirmDeleteEntry) rather than via toast, for the same reason as above:
  // the toast renders in the root tree, behind this Modal's hierarchy.
  const [deleteFailed, setDeleteFailed] = useState(false);
  const { width } = useWindowDimensions();
  // Tablets/wide screens fit all fields on one line; phones stay stacked.
  const isWide = width >= 768;
  const library = useLineItemLibrary();
  const createLibraryEntry = useCreateLibraryEntry();
  const deleteLibraryEntry = useDeleteLibraryEntry();
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
        gstRate: exportMode ? 0 : defaultGstRate,
      },
    ]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  async function saveToLibrary(index: number) {
    const item = items[index];
    if (!item) return;
    const parsed = readLibraryEntryInput({
      description: item.description,
      qty: item.qty,
      unitPriceText: item.unitPriceText,
    });
    if (!parsed.ok) {
      toast.show({ message: parsed.message, variant: "error" });
      return;
    }
    try {
      await createLibraryEntry.mutateAsync({
        ...parsed.entry,
        gstRate: item.gstRate,
      });
      // Confirm the save — without it the icon tap looks like a no-op.
      toast.show({ message: "Saved to library", variant: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        message: errorMessage(err, "Couldn't save."),
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
    closeLibrary();
  }

  async function confirmDeleteEntry(id: string) {
    try {
      await deleteLibraryEntry.mutateAsync(id);
      setPendingDeleteId(null);
      setDeleteFailed(false);
    } catch (err) {
      console.error(err);
      // Show the failure inline and keep the row armed so the user can retry
      // or cancel — a toast fired here renders in the root tree, behind this
      // Sheet's own Modal hierarchy, so on iOS it would be invisible.
      setDeleteFailed(true);
    }
  }

  function armDelete(id: string) {
    setPendingDeleteId(id);
    setDeleteFailed(false);
  }

  function cancelDelete() {
    setPendingDeleteId(null);
    setDeleteFailed(false);
  }

  function closeLibrary() {
    setLibraryOpen(false);
    setPendingDeleteId(null);
    setDeleteFailed(false);
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
        // Same fields in both layouts — only the wrappers differ (single row on
        // tablets, two stacked rows on phones), so define them once here.
        const descriptionInput = (
          <Input
            label="Description"
            value={item.description}
            onChangeText={(v) => update(index, { description: v })}
            placeholder="What did you do?"
          />
        );
        const qtyInput = (
          <NumberInput
            label="Qty"
            value={item.qty}
            onChangeText={(v) => update(index, { qty: v })}
            placeholder="1"
          />
        );
        const unitPriceInput = (
          <CurrencyInput
            label="Unit price"
            value={item.unitPriceText}
            onChangeText={(v) => update(index, { unitPriceText: v })}
          />
        );
        const removeButton = (
          <IconButton
            icon={Trash2}
            accessibilityLabel="Remove line"
            tone="danger"
            onPress={() => remove(index)}
          />
        );
        // Always-visible per-line action so saving to the library doesn't
        // depend on first expanding the (easily-missed) Tax options — the same
        // on phones and tablets.
        const saveButton = (
          <IconButton
            icon={BookmarkPlus}
            accessibilityLabel="Save line to library"
            onPress={() => saveToLibrary(index)}
          />
        );
        const rowActions = (
          <View className="flex-row pt-6">
            {saveButton}
            {removeButton}
          </View>
        );
        return (
          <View key={index} className="gap-3 rounded-card border border-border bg-background p-3">
            {isWide ? (
              <View className="flex-row items-start gap-3">
                <View className="flex-[3]">{descriptionInput}</View>
                <View className="flex-1">{qtyInput}</View>
                <View className="flex-[2]">{unitPriceInput}</View>
                {rowActions}
              </View>
            ) : (
              <>
                <View className="flex-row items-start gap-2">
                  <View className="flex-1">{descriptionInput}</View>
                  {rowActions}
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">{qtyInput}</View>
                  <View className="flex-[2]">{unitPriceInput}</View>
                </View>
              </>
            )}
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
          <Plus size={16} color="#1473FF" />
          <Text className="text-body font-semibold text-accent">Add line</Text>
        </Pressable>
        <Pressable
          onPress={() => setLibraryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Insert from library"
          className="flex-row items-center gap-2 rounded-button border border-border bg-surface px-3"
        >
          <Library size={16} color="#1473FF" />
          <Text className="text-body font-semibold text-foreground">Library</Text>
        </Pressable>
      </View>

      <Sheet
        visible={libraryOpen}
        onClose={closeLibrary}
        title="Insert from library"
      >
        {(library.data ?? []).length === 0 ? (
          <Text className="text-body text-muted">
            No saved lines yet. Tap the bookmark icon on a line item to save it here.
          </Text>
        ) : (
          <View className="max-h-80 overflow-hidden rounded-card border border-border bg-surface">
            {(library.data ?? []).map((entry, idx, arr) => (
              <View key={entry.id}>
                {pendingDeleteId === entry.id ? (
                  <View className="flex-row items-center gap-3 bg-surface px-4 py-3">
                    <Text
                      className={
                        deleteFailed
                          ? "flex-1 text-caption text-status-overdue"
                          : "flex-1 text-caption text-foreground"
                      }
                      numberOfLines={2}
                    >
                      {deleteFailed
                        ? "Couldn't remove — try again"
                        : `Remove “${entry.description}” from the library?`}
                    </Text>
                    <Pressable
                      onPress={cancelDelete}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel remove ${entry.description}`}
                      hitSlop={8}
                    >
                      <Text className="text-body font-semibold text-accent">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteEntry(entry.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm remove ${entry.description}`}
                      hitSlop={8}
                    >
                      <Text className="text-body font-semibold text-status-overdue">Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row items-center bg-surface">
                    <View className="flex-1">
                      <ListRow
                        primary={entry.description}
                        secondary={`${entry.defaultQty} × ${formatMoney(entry.unitPriceCents, currency)}`}
                        trailingMeta={`${(entry.gstRate * 100).toFixed(0)}% GST`}
                        onPress={() => insertFromLibrary(entry)}
                      />
                    </View>
                    <Pressable
                      onPress={() => armDelete(entry.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.description}`}
                      hitSlop={8}
                      className="px-4 py-3"
                    >
                      <Trash2 size={16} color="#C0392B" />
                    </Pressable>
                  </View>
                )}
                {idx < arr.length - 1 ? <View className="h-px bg-border" /> : null}
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
