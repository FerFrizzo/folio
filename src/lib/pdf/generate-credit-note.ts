import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  renderCreditNoteHtml,
  type RenderCreditNoteArgs,
} from "@/src/lib/pdf/credit-note-template";

export type GeneratedPdf = {
  uri: string;
  html: string;
};

export async function generateCreditNotePdf(args: RenderCreditNoteArgs): Promise<GeneratedPdf> {
  const html = renderCreditNoteHtml(args);
  const result = await Print.printToFileAsync({ html, base64: false, width: 595, height: 842 });
  return { uri: result.uri, html };
}

export async function shareCreditNotePdf(uri: string, fileName?: string): Promise<void> {
  if (Platform.OS === "web") {
    const a = document.createElement("a");
    a.href = uri;
    a.download = fileName ?? "credit-note.pdf";
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
    dialogTitle: "Send credit note",
    UTI: "com.adobe.pdf",
  });
}
