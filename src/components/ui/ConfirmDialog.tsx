import { Modal, Pressable, Text, View } from "react-native";
import { Button } from "@/src/components/ui/Button";

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Dismiss dialog"
        className="flex-1 items-center justify-center bg-black/40 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-card border border-border bg-surface p-6"
        >
          <Text className="mb-2 text-h2 text-foreground">{title}</Text>
          {description ? (
            <Text className="mb-6 text-body text-muted">{description}</Text>
          ) : null}
          <View className="flex-row justify-end gap-2">
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} />
            <Button
              variant={destructive ? "danger" : "primary"}
              label={confirmLabel}
              onPress={onConfirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
