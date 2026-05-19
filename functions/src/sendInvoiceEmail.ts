import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { adminDb } from "./lib/admin";
import { requireUid } from "./lib/auth";
import {
  fetchInvoice,
  fetchProfile,
  fetchSettings,
  fetchSubscription,
} from "./lib/firestore";
import { generateInvoicePdfBuffer } from "./lib/pdf";
import { uploadInvoicePdf } from "./lib/storage";
import { sendDynamicEmail } from "./lib/sendgrid";
import { claimNextInvoiceNumberInTx } from "./lib/counters";
import { formatMoney } from "./lib/money";

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const SENDGRID_TEMPLATE_ID = defineSecret("SENDGRID_TEMPLATE_ID");
const SENDGRID_SENDER = defineSecret("SENDGRID_SENDER");

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024; // 10 MB combined per spec §11

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  base64: z.string().min(1),
});

const PayloadSchema = z.object({
  invoiceId: z.string().min(1),
  to: z.string().email(),
  cc: z.array(z.string().email()).max(10).optional(),
  subject: z.string().min(1).max(998),
  body: z.string().max(20_000),
  attachments: z.array(AttachmentSchema).max(MAX_ATTACHMENTS).optional(),
});
export type SendInvoiceEmailPayload = z.infer<typeof PayloadSchema>;

export const sendInvoiceEmail = onCall(
  {
    region: "australia-southeast1",
    secrets: [SENDGRID_API_KEY, SENDGRID_TEMPLATE_ID, SENDGRID_SENDER],
    memory: "1GiB", // headroom for chromium
    timeoutSeconds: 120,
  },
  async (req) => {
    const uid = requireUid(req);

    // Server-side entitlement gate — never trust the client.
    const subscription = await fetchSubscription(uid);
    if ((subscription?.entitlement ?? "free") !== "pro") {
      throw new HttpsError(
        "permission-denied",
        "Folio Pro is required to send invoices by email. Upgrade in Settings.",
      );
    }

    const parsed = PayloadSchema.safeParse(req.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Invalid payload.");
    }
    const data = parsed.data;

    // Per spec §11: hard-cap user attachments at 10 MB combined before
    // SendGrid's 30 MB limit hits.
    const attachments = data.attachments ?? [];
    let totalBytes = 0;
    for (const a of attachments) {
      const decodedSize = Math.floor((a.base64.length * 3) / 4);
      totalBytes += decodedSize;
    }
    if (totalBytes > MAX_ATTACHMENTS_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        "Attachments exceed the 10 MB combined limit.",
      );
    }

    // Ownership check via Admin SDK.
    const invoice = await fetchInvoice(uid, data.invoiceId);
    if (!invoice) {
      throw new HttpsError("not-found", "Invoice not found.");
    }
    const profile = await fetchProfile(uid);
    const settings = await fetchSettings(uid);

    // If still a draft, claim a number + flip to sent inside the transaction
    // before generating the PDF (so the PDF reflects the final number).
    let workingInvoice = invoice;
    if (workingInvoice.status === "draft") {
      workingInvoice = await adminDb().runTransaction(async (tx) => {
        const ref = adminDb().doc(`users/${uid}/invoices/${data.invoiceId}`);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new HttpsError("not-found", "Invoice disappeared mid-send.");
        }
        const current = { id: snap.id, ...(snap.data() as object) } as typeof workingInvoice;
        if (current.status !== "draft") return current;
        const { number } = await claimNextInvoiceNumberInTx(tx, uid, settings);
        const sentAt = new Date().toISOString();
        tx.update(ref, {
          number,
          status: "sent",
          sentAt,
          updatedAt: sentAt,
        });
        return { ...current, number, status: "sent", sentAt, updatedAt: sentAt };
      });
    }

    // Generate the PDF. isPro is always true here — entitlement gate above.
    const { buffer, html } = await generateInvoicePdfBuffer({
      invoice: workingInvoice,
      profile,
      settings,
      isPro: true,
    });
    const upload = await uploadInvoicePdf(
      uid,
      workingInvoice.id,
      html,
      buffer,
    );

    // Persist pdfUrl + sentAt (sentAt was set above for drafts; for sent
    // invoices, it may already be set — preserve it, otherwise stamp now).
    const sentAt = workingInvoice.sentAt ?? new Date().toISOString();
    await adminDb().doc(`users/${uid}/invoices/${workingInvoice.id}`).update({
      pdfUrl: upload.url,
      sentAt,
      updatedAt: new Date().toISOString(),
    });

    // Compose the SendGrid request.
    const result = await sendDynamicEmail({
      apiKey: SENDGRID_API_KEY.value(),
      templateId: SENDGRID_TEMPLATE_ID.value(),
      from: SENDGRID_SENDER.value(),
      to: data.to,
      ...(data.cc?.length ? { cc: data.cc } : {}),
      subject: data.subject,
      dynamicTemplateData: {
        number: workingInvoice.number,
        businessName: profile.businessName || "Your business",
        clientName: workingInvoice.clientSnapshot.name,
        total: formatMoney(workingInvoice.totalCents, workingInvoice.currency),
        dueDate: workingInvoice.dueDate,
        body: data.body,
        pdfUrl: upload.url,
      },
      attachments: [
        {
          filename: `${workingInvoice.number}.pdf`,
          type: "application/pdf",
          content: buffer.toString("base64"),
        },
        ...attachments.map((a) => ({
          filename: a.filename,
          type: a.mimeType,
          content: a.base64,
        })),
      ],
    });

    return { ok: true as const, ...result };
  },
);
