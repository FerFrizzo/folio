import { adminStorage } from "./admin";

export async function uploadInvoicePdf(
  uid: string,
  invoiceId: string,
  _html: string,
  buffer: Buffer,
): Promise<{ url: string; path: string }> {
  const path = `users/${uid}/invoices/${invoiceId}/invoice.pdf`;
  const file = adminStorage().bucket().file(path);
  await file.save(buffer, { metadata: { contentType: "application/pdf" } });
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  return { url, path };
}

export async function uploadExportZip(
  uid: string,
  buffer: Buffer,
): Promise<{ url: string; path: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `users/${uid}/exports/${timestamp}.zip`;
  const file = adminStorage().bucket().file(path);
  await file.save(buffer, { metadata: { contentType: "application/zip" } });
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return { url, path };
}
