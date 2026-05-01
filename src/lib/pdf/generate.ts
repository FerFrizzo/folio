import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  renderInvoiceHtml,
  type RenderInvoiceArgs,
} from "@/src/lib/pdf/template";

export type GeneratedPdf = {
  uri: string;
  html: string;
};

// Generate a PDF from the classic invoice template. Returns a local file URI
// (native) or a base64 data URL (web — Print.printAsync handles printing on
// web, while printToFileAsync produces a downloadable file).
export async function generateInvoicePdf(args: RenderInvoiceArgs): Promise<GeneratedPdf> {
  const html = renderInvoiceHtml(args);
  const result = await Print.printToFileAsync({ html, base64: false });
  return { uri: result.uri, html };
}

// Cross-platform share. Native: native share sheet. Web: triggers a download
// of the file (expo-sharing falls back to anchor-click on web).
export async function shareInvoicePdf(uri: string, fileName?: string): Promise<void> {
  if (Platform.OS === "web") {
    // expo-sharing.isAvailableAsync returns false on web; manually trigger a
    // download from the data URI / blob URL.
    const a = document.createElement("a");
    a.href = uri;
    a.download = fileName ?? "invoice.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Send invoice",
    UTI: "com.adobe.pdf",
  });
}
