import { render, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InvoicePreviewModal } from "@/src/features/invoices/InvoicePreviewModal";
import { InvoiceSchema, ProfileSchema, SettingsSchema } from "@/src/types/schemas";

// WebView reaches for a native module that doesn't exist under Jest. Swapping
// it for a View keeps its props inspectable, which is how these tests read the
// HTML that would have been rendered.
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: View };
});

const invoice = InvoiceSchema.parse({
  id: "inv-1",
  number: "INV-0005",
  status: "draft",
  currency: "AUD",
  clientId: null,
  clientSnapshot: { name: "Acme Pty Ltd" },
  issueDate: "2026-08-04",
  dueDate: "2026-08-18",
  lineItems: [],
  subtotalCents: 0,
  gstTotalCents: 0,
  totalCents: 0,
  balanceCents: 0,
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
});
const profile = ProfileSchema.parse({ businessName: "Frizzo Design" });
const settings = SettingsSchema.parse({});

// The modal pads its header by the safe-area inset, so it needs a provider with
// concrete metrics rather than the real device measurement.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderModal(overrides: { visible?: boolean; isPro?: boolean } = {}) {
  const onClose = jest.fn();
  const utils = render(
    <SafeAreaProvider initialMetrics={metrics}>
      <InvoicePreviewModal
        visible={overrides.visible ?? true}
        onClose={onClose}
        invoice={invoice}
        profile={profile}
        settings={settings}
        isPro={overrides.isPro ?? true}
      />
    </SafeAreaProvider>,
  );
  return { onClose, ...utils };
}

function previewHtml(utils: ReturnType<typeof renderModal>): string {
  const source = utils.getByTestId("invoice-preview-webview").props.source;
  return (source as { html: string }).html;
}

describe("InvoicePreviewModal", () => {
  it("renders nothing when hidden", () => {
    const utils = renderModal({ visible: false });
    expect(utils.queryByTestId("invoice-preview-webview")).toBeNull();
  });

  it("renders the invoice when visible", () => {
    const utils = renderModal();
    expect(previewHtml(utils)).toContain("INV-0005");
    expect(previewHtml(utils)).toContain("Acme Pty Ltd");
  });

  // A free user's preview must not look better than the PDF they'll actually
  // send — the watermark has to be visible here too.
  it("shows the Folio watermark for a free user", () => {
    expect(previewHtml(renderModal({ isPro: false }))).toContain("Made with Folio");
  });

  it("omits the watermark for a Pro user", () => {
    expect(previewHtml(renderModal({ isPro: true }))).not.toContain("Made with Folio");
  });

  it("closes when the close control is pressed", () => {
    const utils = renderModal();
    fireEvent.press(utils.getByLabelText("Close preview"));
    expect(utils.onClose).toHaveBeenCalledTimes(1);
  });
});
