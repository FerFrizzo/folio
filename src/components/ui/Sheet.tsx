import { Modal, Platform, Pressable, Text, View, type ViewProps } from "react-native";

type Props = ViewProps & {
  visible: boolean;
  title?: string;
  onClose: () => void;
};

// Sheet picks the right idiom per platform: bottom-sheet on mobile, centered
// modal on web. Both share the same API. Native bottom-sheet here is a simple
// slide-up `Modal` with content pinned to the bottom. A swipe-to-dismiss native
// component lands in Phase 2 if needed.
export function Sheet({ visible, title, onClose, children, ...rest }: Props) {
  const isWeb = Platform.OS === "web";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss sheet"
        className="flex-1 bg-black/40"
        style={{ justifyContent: isWeb ? "center" : "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className={
            isWeb
              ? "mx-auto w-full max-w-md rounded-card border border-border bg-surface p-6"
              : "rounded-t-[16px] border-x border-t border-border bg-surface p-6"
          }
          {...rest}
        >
          {!isWeb ? (
            <View className="mb-4 self-center h-1 w-10 rounded-full bg-border" />
          ) : null}
          {title ? (
            <Text className="mb-4 text-h2 text-foreground">{title}</Text>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
