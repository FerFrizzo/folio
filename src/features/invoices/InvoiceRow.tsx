import { useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import { Check, Trash2, DollarSign } from "lucide-react-native";
import type { Invoice, InvoiceDisplayStatus } from "@/src/types/invoice";
import { deriveDisplayStatus } from "@/src/types/invoice";
import { formatMoney } from "@/src/lib/money";
import { ListRow } from "@/src/components/ui/ListRow";

type Props = {
  invoice: Invoice;
  onPress?: (invoice: Invoice) => void;
  onLongPress?: (invoice: Invoice) => void;
  onMarkPaid?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onRecordPayment?: (invoice: Invoice) => void;
};

function dueLabel(invoice: Invoice, today = new Date()): string {
  const due = new Date(invoice.dueDate);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((due.getTime() - todayMid.getTime()) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays > 0) return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
}

function paidLabel(invoice: Invoice): string {
  if (!invoice.paidAt) return "Paid";
  return `Paid ${invoice.paidAt}`;
}

function statusForBadge(display: InvoiceDisplayStatus) {
  return display;
}

// Swipe gestures on web are unreliable in react-native-gesture-handler — long-
// press is the cross-platform fallback. Touch swipes on iOS/Android use Swipeable.
const supportsSwipe = Platform.OS !== "web";

export function InvoiceRow({
  invoice,
  onPress,
  onLongPress,
  onMarkPaid,
  onDelete,
  onRecordPayment,
}: Props) {
  const swipeableRef = useRef<Swipeable | null>(null);
  const display = deriveDisplayStatus(invoice);
  const overdue = display === "overdue";

  const trailingMeta =
    display === "paid" ? paidLabel(invoice) : dueLabel(invoice);

  const canRecord =
    invoice.status === "sent" || invoice.status === "partial";

  const close = () => swipeableRef.current?.close();

  function tapMarkPaid() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    close();
    onMarkPaid?.(invoice);
  }

  function tapDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    close();
    onDelete?.(invoice);
  }

  function tapRecord() {
    close();
    onRecordPayment?.(invoice);
  }

  const row = (
    <ListRow
      primary={invoice.number}
      secondary={invoice.clientSnapshot.name}
      trailingAmount={formatMoney(invoice.totalCents, invoice.currency)}
      trailingMeta={trailingMeta}
      status={statusForBadge(display)}
      overdue={overdue}
      onPress={() => onPress?.(invoice)}
      onLongPress={() => onLongPress?.(invoice)}
      accessibilityLabel={`Invoice ${invoice.number} for ${invoice.clientSnapshot.name}`}
    />
  );

  if (!supportsSwipe) {
    return row;
  }

  function renderLeftActions() {
    if (!canRecord) return null;
    return (
      <Pressable
        onPress={tapRecord}
        accessibilityRole="button"
        accessibilityLabel="Record payment"
        className="h-full w-[96px] items-center justify-center bg-status-partial active:opacity-90"
      >
        <DollarSign size={20} color="#FFFFFF" />
        <Text className="mt-1 text-caption font-semibold text-white">Record</Text>
      </Pressable>
    );
  }

  function renderRightActions() {
    return (
      <View className="h-full flex-row">
        <Pressable
          onPress={tapMarkPaid}
          accessibilityRole="button"
          accessibilityLabel="Mark paid"
          className="h-full w-[96px] items-center justify-center bg-status-paid active:opacity-90"
        >
          <Check size={20} color="#FFFFFF" />
          <Text className="mt-1 text-caption font-semibold text-white">Mark paid</Text>
        </Pressable>
        <Pressable
          onPress={tapDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete invoice"
          className="h-full w-[96px] items-center justify-center bg-status-overdue active:opacity-90"
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text className="mt-1 text-caption font-semibold text-white">Delete</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }}
      renderLeftActions={canRecord ? renderLeftActions : undefined}
      renderRightActions={renderRightActions}
    >
      {row}
    </Swipeable>
  );
}
