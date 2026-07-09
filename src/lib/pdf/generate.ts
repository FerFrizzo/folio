import * as Print from "expo-print";
import { renderInvoiceHtml as renderPro, type RenderInvoiceArgs } from "@/src/lib/pdf/template-pro";
import { renderInvoiceHtml as renderFree } from "@/src/lib/pdf/template-free";
import { sharePdf } from "@/src/lib/pdf/share";

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
  const result = await Print.printToFileAsync({ html, base64: false, width: 595, height: 842 });
  return { uri: result.uri, html };
}

export async function shareInvoicePdf(uri: string, fileName?: string): Promise<void> {
  await sharePdf(uri, { fileName, fallback: "invoice", dialogTitle: "Send invoice" });
}
