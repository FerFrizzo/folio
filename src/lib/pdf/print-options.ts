import { Platform } from "react-native";
import type { FilePrintOptions } from "expo-print";

export type PageMarginsMm = { top: number; right: number; bottom: number; left: number };

// Must match each template's `@page { margin }` (asserted in the test).
export const INVOICE_PAGE_MARGINS_MM: PageMarginsMm = { top: 18, right: 16, bottom: 20, left: 16 };
export const CREDIT_NOTE_PAGE_MARGINS_MM: PageMarginsMm = { top: 20, right: 15, bottom: 20, left: 15 };

const PT_PER_MM = 72 / 25.4;

export function mmToPt(mm: number): number {
  return Math.round(mm * PT_PER_MM * 100) / 100;
}

// A4 in points. iOS's WKWebView print renderer ignores CSS `@page` margins and
// lays content out over expo-print's printable rect, which defaults to the
// whole sheet — so PDFs made on iPhone ran edge to edge and printers clipped
// the left side. Pass the template's margins natively there. Android
// (Chromium) and the server (puppeteer) honour `@page`, so adding them would
// double the margin.
export function pdfPrintOptions(html: string, marginsMm: PageMarginsMm): FilePrintOptions {
  const options: FilePrintOptions = { html, base64: false, width: 595, height: 842 };
  if (Platform.OS === "ios") {
    options.margins = {
      top: mmToPt(marginsMm.top),
      right: mmToPt(marginsMm.right),
      bottom: mmToPt(marginsMm.bottom),
      left: mmToPt(marginsMm.left),
    };
  }
  return options;
}
