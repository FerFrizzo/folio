import * as Print from "expo-print";
import {
  buildInvoicesCsv,
  buildLineItemsCsv,
} from "@/src/lib/exports/invoicesCsv";
import { buildZip, shareZip } from "@/src/lib/exports/zip";
import { renderInvoiceHtml } from "@/src/lib/pdf/template";
import { renderCreditNoteHtml } from "@/src/lib/pdf/credit-note-template";
import type {
  CreditNote,
  Invoice,
  Profile,
  Settings,
} from "@/src/types/schemas";

export async function exportCsvZip(
  invoices: Invoice[],
  creditNotes: CreditNote[],
): Promise<void> {
  const invoicesCsv = buildInvoicesCsv(invoices, creditNotes);
  const lineItemsCsv = buildLineItemsCsv(invoices, creditNotes);
  const bytes = await buildZip([
    { name: "invoices.csv", content: invoicesCsv },
    { name: "lineItems.csv", content: lineItemsCsv },
  ]);
  const filename = `folio-export-${new Date().toISOString().slice(0, 10)}.zip`;
  await shareZip(filename, bytes);
}

export async function exportPdfZip(
  invoices: Invoice[],
  creditNotes: CreditNote[],
  profile: Profile,
  settings: Settings,
): Promise<void> {
  const entries: { name: string; content: Uint8Array }[] = [];

  for (const inv of invoices) {
    const html = renderInvoiceHtml({ invoice: inv, profile, settings });
    const result = await Print.printToFileAsync({ html, base64: true });
    if (!result.base64) continue;
    entries.push({
      name: `${inv.number}.pdf`,
      content: base64ToBytes(result.base64),
    });
  }

  for (const cn of creditNotes) {
    const html = renderCreditNoteHtml({ creditNote: cn, profile, settings });
    const result = await Print.printToFileAsync({ html, base64: true });
    if (!result.base64) continue;
    entries.push({
      name: `${cn.number}.pdf`,
      content: base64ToBytes(result.base64),
    });
  }

  const bytes = await buildZip(entries);
  const filename = `folio-pdfs-${new Date().toISOString().slice(0, 10)}.zip`;
  await shareZip(filename, bytes);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
