import { Platform } from "react-native";
import * as Print from "expo-print";
import { renderInvoiceHtml as renderPro, type RenderInvoiceArgs } from "@/src/lib/pdf/template-pro";
import { renderInvoiceHtml as renderFree } from "@/src/lib/pdf/template-free";
import { sharePdf } from "@/src/lib/pdf/share";
import { INVOICE_PAGE_MARGINS_MM, pdfPrintOptions } from "@/src/lib/pdf/print-options";

export type GeneratedPdf = {
  uri: string;
  html: string;
};

export type GenerateInvoicePdfArgs = RenderInvoiceArgs & {
  isPro: boolean;
};

// Generate a PDF from the classic invoice template. Returns a local file URI
// (native) or a base64 data URL (web — Print.printAsync handles printing on
// web, while printToFileAsync produces a downloadable file).
// isPro controls whether the watermark-free Pro template or the free variant is used.
export async function generateInvoicePdf(args: GenerateInvoicePdfArgs): Promise<GeneratedPdf> {
  const renderFn = args.isPro ? renderPro : renderFree;
  const html = renderFn(args);
  // The web implementation of printToFileAsync calls window.print() and
  // returns undefined, so the preview never receives HTML. The page shows
  // that HTML in an iframe; printing stays a separate action.
  if (Platform.OS === "web") return { uri: "", html };
  const result = await Print.printToFileAsync(pdfPrintOptions(html, INVOICE_PAGE_MARGINS_MM));
  return { uri: result.uri, html };
}

export async function shareInvoicePdf(uri: string, fileName?: string): Promise<void> {
  await sharePdf(uri, { fileName, fallback: "invoice", dialogTitle: "Send invoice" });
}
