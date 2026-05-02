import { httpsCallable } from "firebase/functions";
import { File } from "expo-file-system";
import { getFirebaseFunctions } from "@/src/lib/firebase";

// Client wrapper around the sendInvoiceEmail callable. Reads each picked
// file's bytes via expo-file-system v19, base64-encodes, and forwards.
//
// The function enforces the 5-files / 10MB combined limit; we also enforce
// it client-side so the user gets fast feedback before paying the upload
// round-trip.

export type ClientAttachment = {
  filename: string;
  mimeType: string;
  uri: string; // expo-document-picker file:// URI
  sizeBytes: number;
};

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

export type SendInvoiceEmailInput = {
  invoiceId: string;
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  attachments: ClientAttachment[];
};

export type SendInvoiceEmailResult = {
  ok: true;
  messageId?: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  if (typeof btoa === "function") return btoa(binary);
  // Node fallback (tests).
  return Buffer.from(binary, "binary").toString("base64");
}

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult> {
  if (input.attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`At most ${MAX_ATTACHMENTS} attachments per email.`);
  }
  const totalBytes = input.attachments.reduce((s, a) => s + a.sizeBytes, 0);
  if (totalBytes > MAX_ATTACHMENTS_BYTES) {
    throw new Error("Attachments exceed 10 MB combined.");
  }

  const encoded: { filename: string; mimeType: string; base64: string }[] = [];
  for (const a of input.attachments) {
    const file = new File(a.uri);
    const bytes = await file.bytes();
    encoded.push({
      filename: a.filename,
      mimeType: a.mimeType,
      base64: bytesToBase64(bytes),
    });
  }

  const fn = httpsCallable<
    {
      invoiceId: string;
      to: string;
      cc?: string[];
      subject: string;
      body: string;
      attachments: { filename: string; mimeType: string; base64: string }[];
    },
    SendInvoiceEmailResult
  >(getFirebaseFunctions(), "sendInvoiceEmail");

  const result = await fn({
    invoiceId: input.invoiceId,
    to: input.to,
    ...(input.cc?.length ? { cc: input.cc } : {}),
    subject: input.subject,
    body: input.body,
    attachments: encoded,
  });
  return result.data;
}

// Server-side PDF-ZIP export — used by the >50 doc path on the client.
export async function callExportPdfsZip(): Promise<{ ok: true; url: string; count: number }> {
  const fn = httpsCallable<unknown, { ok: true; url: string; count: number; path: string }>(
    getFirebaseFunctions(),
    "exportPdfsZip",
  );
  const result = await fn({});
  return result.data;
}
