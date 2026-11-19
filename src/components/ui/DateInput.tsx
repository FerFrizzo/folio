import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { cn } from "@/src/lib/cn";
import {
  dateEntryError,
  dateFromIso,
  formatIsoDate,
  isoFromDate,
  isRealIsoDate,
} from "@/src/lib/iso-date";
import { Accent } from "@/src/theme/colors";

type Props = {
  label?: string;
  required?: boolean;
  error?: string | null;
  value: string; // ISO YYYY-MM-DD, or "" when unset
  onChange: (next: string) => void;
  placeholder?: string;
  // Optional dates (payments) can be cleared from the field. The invoice due
  // date keeps its own "Clear due date" control.
  clearable?: boolean;
};

function commitPickedDate(
  event: DateTimePickerEvent,
  date: Date | undefined,
  onChange: (next: string) => void,
) {
  if (event.type !== "set" || !date) return;
  const iso = isoFromDate(date);
  if (iso) onChange(iso);
}

export function DateInput({
  label,
  required,
  error,
  value,
  onChange,
  placeholder = "Select date",
  clearable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const trimmed = value.trim();
  const selected = dateFromIso(trimmed);
  const display = selected ? formatIsoDate(trimmed) : null;
  const entryError = dateEntryError(value);
  const shownError = error ?? entryError;
  const shownText = display ?? (trimmed || placeholder);
  const borderClass = shownError ? "border-status-overdue" : "border-border";
  const fieldLabel = label ?? "Date";

  function openPicker() {
    const pickerDate = selected ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: pickerDate,
        mode: "date",
        display: "default",
        onChange: (event, date) => commitPickedDate(event, date, onChange),
      });
      return;
    }
    setOpen(true);
  }

  return (
    <View className="gap-1">
      {label ? (
        <View className="flex-row items-center gap-1">
          <Text className="text-label text-foreground">{label}</Text>
          {required ? (
            <View className="h-1 w-1 rounded-full bg-accent" />
          ) : null}
        </View>
      ) : null}
      {Platform.OS === "web" ? (
        <View
          className={cn(
            "h-11 justify-center rounded-button border bg-surface px-3",
            borderClass,
          )}
          style={{ position: "relative" }}
        >
          <Text
            accessible={false}
            className={cn(
              "text-body",
              display || trimmed ? "text-foreground" : "text-muted",
            )}
            style={display || trimmed ? undefined : { color: "#9CA3AF" }}
            numberOfLines={1}
          >
            {shownText}
          </Text>
          <input
            type="date"
            aria-label={fieldLabel}
            value={isRealIsoDate(trimmed) ? trimmed : ""}
            onChange={(event: { target: { value: string } }) =>
              onChange(event.target.value)
            }
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
              border: "none",
            }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fieldLabel}
          accessibilityHint="Opens the date picker"
          accessibilityValue={display ? { text: display } : undefined}
          onPress={openPicker}
          className={cn(
            "h-11 flex-row items-center rounded-button border bg-surface px-3",
            borderClass,
          )}
        >
          <Text
            accessible={false}
            className={cn(
              "flex-1 text-body",
              display || trimmed ? "text-foreground" : "text-muted",
            )}
            style={display || trimmed ? undefined : { color: "#9CA3AF" }}
            numberOfLines={1}
          >
            {shownText}
          </Text>
        </Pressable>
      )}
      {clearable && trimmed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear date"
          onPress={() => onChange("")}
          className="mt-1"
        >
          <Text className="text-caption text-accent">Clear date</Text>
        </Pressable>
      ) : null}
      {shownError ? (
        <Text className="text-caption text-status-overdue">{shownError}</Text>
      ) : null}
      {Platform.OS === "ios" ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={fieldLabel}>
          <DateTimePicker
            testID="date-picker"
            value={selected ?? new Date()}
            mode="date"
            display="inline"
            onChange={(event, date) => commitPickedDate(event, date, onChange)}
            accentColor={Accent.DEFAULT}
            themeVariant="light"
            style={{ height: 360 }}
          />
          <Button
            label="Done"
            variant="secondary"
            onPress={() => setOpen(false)}
          />
        </Sheet>
      ) : null}
    </View>
  );
}
