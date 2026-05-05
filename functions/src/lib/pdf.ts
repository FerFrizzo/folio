import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  renderInvoiceHtml,
  type RenderInvoiceArgs,
} from "./template-snapshot/invoice";
import {
  renderCreditNoteHtml,
  type RenderCreditNoteArgs,
} from "./template-snapshot/credit-note";

async function htmlToBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateInvoicePdfBuffer(
  args: RenderInvoiceArgs,
): Promise<{ buffer: Buffer; html: string }> {
  const html = renderInvoiceHtml(args);
  const buffer = await htmlToBuffer(html);
  return { buffer, html };
}

export async function generateCreditNotePdfBuffer(
  args: RenderCreditNoteArgs,
): Promise<{ buffer: Buffer; html: string }> {
  const html = renderCreditNoteHtml(args);
  const buffer = await htmlToBuffer(html);
  return { buffer, html };
}
