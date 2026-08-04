import { Modal, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import WebView from "react-native-webview";
import { IconButton } from "@/src/components/ui/IconButton";
import { renderInvoiceHtml as renderPro } from "@/src/lib/pdf/template-pro";
import { renderInvoiceHtml as renderFree } from "@/src/lib/pdf/template-free";
import type { Invoice, Profile, Settings } from "@/src/types/schemas";

type Props = {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice;
  profile: Profile;
  settings: Settings;
  isPro: boolean;
};

// Renders the invoice template itself rather than generating a PDF: the output
// is identical because it's the same template the PDF is printed from, and it
// costs nothing to open. The Pro/free split is deliberate — a free user's
// preview has to show the watermark their PDF will carry.
export function InvoicePreviewModal({
  visible,
  onClose,
  invoice,
  profile,
  settings,
  isPro,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const html = (isPro ? renderPro : renderFree)({ invoice, profile, settings });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-background">
        <View
          className="flex-row items-center justify-between border-b border-border bg-background px-4 pb-3"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-h2 text-foreground">Preview</Text>
          <IconButton icon={X} accessibilityLabel="Close preview" onPress={onClose} />
        </View>
        {Platform.OS === "web" ? (
          <iframe
            srcDoc={html}
            title="Invoice preview"
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
          />
        ) : (
          <WebView
            source={{ html }}
            originWhitelist={["*"]}
            style={{ flex: 1 }}
            testID="invoice-preview-webview"
          />
        )}
      </View>
    </Modal>
  );
}
