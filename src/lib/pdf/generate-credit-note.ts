import * as Print from "expo-print";
import {
  renderCreditNoteHtml,
  type RenderCreditNoteArgs,
} from "@/src/lib/pdf/credit-note-template";
import { sharePdf } from "@/src/lib/pdf/share";
import { CREDIT_NOTE_PAGE_MARGINS_MM, pdfPrintOptions } from "@/src/lib/pdf/print-options";

export type GeneratedPdf = {
  uri: string;
  html: string;
};

export async function generateCreditNotePdf(args: RenderCreditNoteArgs): Promise<GeneratedPdf> {
  const html = renderCreditNoteHtml(args);
  const result = await Print.printToFileAsync(pdfPrintOptions(html, CREDIT_NOTE_PAGE_MARGINS_MM));
  return { uri: result.uri, html };
}

export async function shareCreditNotePdf(uri: string, fileName?: string): Promise<void> {
  await sharePdf(uri, { fileName, fallback: "credit-note", dialogTitle: "Send credit note" });
}
