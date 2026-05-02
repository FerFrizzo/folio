import * as Crypto from "expo-crypto";
import type { Invoice } from "@/src/types/schemas";

// Storage caching uses a content-hash naming scheme:
//   users/{uid}/invoices/{invoiceId}-{sha256(html)}.pdf
// The Cloud Function uploads on send; the client reads `invoice.pdfUrl` if
// already populated. When the user views a Sent invoice, we prefer the cached
// URL over regenerating to keep the detail screen instant after the first send.

export async function contentHashOf(html: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    html,
  );
}

export function pdfStoragePath(uid: string, invoiceId: string, hash: string): string {
  return `users/${uid}/invoices/${invoiceId}-${hash}.pdf`;
}

// True when the invoice has a server-cached PDF URL we can render without
// re-generating client-side. Doesn't verify the hash matches the current
// content — the function pins URL ↔ content on upload, so a stale URL only
// happens when the user edits the invoice after a previous send. In that case
// we still render the cached one (fine) or re-cache on next send.
export function getCachedPdfUrl(invoice: Invoice): string | null {
  return invoice.pdfUrl ?? null;
}
