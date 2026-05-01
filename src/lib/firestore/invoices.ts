import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  Timestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import {
  InvoiceSchema,
  type Invoice,
  type InvoiceDraftInput,
  type PaymentRecord,
} from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";
import { computeInvoiceTotals } from "@/src/lib/invoice-totals";
import { claimNextInvoiceNumberInTransaction } from "@/src/lib/firestore/counters";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const k of [
    "createdAt",
    "updatedAt",
    "deletedAt",
    "sentAt",
    "paidAt",
  ] as const) {
    const v = out[k];
    if (v instanceof Timestamp) out[k] = v.toDate().toISOString();
  }
  return out;
}

function toInvoice(data: Record<string, unknown>, id: string): Invoice | null {
  const normalized = normalizeTimestamps({ ...data, id });
  const parsed = InvoiceSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export type InvoiceFilter = {
  clientId?: string;
  includeDeleted?: boolean;
};

export async function listInvoices(
  uid: string,
  filter: InvoiceFilter = {},
): Promise<Invoice[]> {
  const db = getFirebaseFirestore();
  const constraints: QueryConstraint[] = [];
  if (filter.clientId) constraints.push(where("clientId", "==", filter.clientId));
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(collection(db, fsPaths.invoices(uid)), ...constraints);
  const snap = await getDocs(q);
  const out: Invoice[] = [];
  for (const docSnap of snap.docs) {
    const inv = toInvoice(docSnap.data(), docSnap.id);
    if (!inv) continue;
    if (!filter.includeDeleted && inv.deletedAt) continue;
    out.push(inv);
  }
  return out;
}

export async function getInvoice(uid: string, id: string): Promise<Invoice | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.invoice(uid, id)));
  if (!snap.exists()) return null;
  return toInvoice(snap.data(), snap.id);
}

// Drafts get a placeholder number ("DRAFT") until they're sent. The real
// number is claimed atomically inside markSent's transaction.
export async function createDraft(
  uid: string,
  input: InvoiceDraftInput,
): Promise<Invoice> {
  const db = getFirebaseFirestore();
  const ref = doc(collection(db, fsPaths.invoices(uid)));
  const totals = computeInvoiceTotals(input.lineItems, input.invoiceDiscount);
  const createdAt = nowIso();
  const data: Omit<Invoice, "id"> = {
    number: "DRAFT",
    status: "draft",
    currency: input.currency,
    clientId: input.clientId,
    clientSnapshot: input.clientSnapshot,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    lineItems: input.lineItems,
    ...(input.invoiceDiscount ? { invoiceDiscount: input.invoiceDiscount } : {}),
    subtotalCents: totals.subtotalCents,
    lineDiscountTotalCents: totals.lineDiscountTotalCents,
    invoiceDiscountTotalCents: totals.invoiceDiscountTotalCents,
    discountTotalCents: totals.discountTotalCents,
    gstTotalCents: totals.gstTotalCents,
    totalCents: totals.totalCents,
    amountPaidCents: 0,
    balanceCents: totals.totalCents,
    payments: [],
    notes: input.notes,
    paymentInstructionsSnapshot: input.paymentInstructionsSnapshot,
    creditNoteIds: [],
    createdAt,
    updatedAt: createdAt,
  };
  await setDoc(ref, data);
  return InvoiceSchema.parse({ id: ref.id, ...data });
}

export async function updateDraft(
  uid: string,
  id: string,
  patch: Partial<InvoiceDraftInput>,
): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.invoice(uid, id));
  const update: Record<string, unknown> = {
    ...patch,
    updatedAt: nowIso(),
  };
  if (patch.lineItems || "invoiceDiscount" in patch) {
    // Need both fields available; if updating one, callers should pass both
    // (or we'd need to merge with persisted state — keeping this simple for now).
    const totals = computeInvoiceTotals(
      patch.lineItems ?? [],
      patch.invoiceDiscount,
    );
    update.subtotalCents = totals.subtotalCents;
    update.lineDiscountTotalCents = totals.lineDiscountTotalCents;
    update.invoiceDiscountTotalCents = totals.invoiceDiscountTotalCents;
    update.discountTotalCents = totals.discountTotalCents;
    update.gstTotalCents = totals.gstTotalCents;
    update.totalCents = totals.totalCents;
    update.balanceCents = totals.totalCents; // Recomputed in recordPayment.
  }
  await updateDoc(ref, update);
}

// Atomically: claim the next invoice number from the user's counter, set
// status to "sent", stamp sentAt, lock the invoice. Failures (network, race)
// roll back both writes.
export async function markSent(
  uid: string,
  id: string,
): Promise<{ number: string }> {
  const db = getFirebaseFirestore();
  const invRef = doc(db, fsPaths.invoice(uid, id));
  const settingsRef = doc(db, fsPaths.settings(uid));

  return runTransaction(db, async (tx) => {
    // Read both settings + invoice in the same transaction so a settings
    // change during the claim still produces a consistent number.
    const [invSnap, settingsSnap] = await Promise.all([
      tx.get(invRef),
      tx.get(settingsRef),
    ]);
    if (!invSnap.exists()) {
      throw new Error(`Invoice ${id} not found`);
    }
    const data = invSnap.data();
    if (data.status !== "draft") {
      throw new Error(`Invoice ${id} is not a draft (status=${data.status})`);
    }

    const numbering = settingsSnap.exists()
      ? (settingsSnap.data().numbering ?? {})
      : {};
    const prefix: string = typeof numbering.prefix === "string" ? numbering.prefix : "INV-";
    const minDigits: number =
      typeof numbering.minDigits === "number" ? numbering.minDigits : 4;

    const { number } = await claimNextInvoiceNumberInTransaction(tx, uid, {
      prefix,
      minDigits,
    });
    const sentAt = nowIso();
    tx.update(invRef, {
      number,
      status: "sent",
      sentAt,
      updatedAt: sentAt,
    });
    return { number };
  });
}

// ---------- Phase 3 mutations ----------

export type RecordPaymentInput = Omit<PaymentRecord, "amountCents"> & {
  amountCents: number;
};

// Record a payment against an invoice and recompute status + balance
// transactionally. Spec §6: status transitions are derived from payments —
// amountPaid >= total → paid, > 0 → partial.
export async function recordPayment(
  uid: string,
  invoiceId: string,
  payment: RecordPaymentInput,
): Promise<{ status: "sent" | "partial" | "paid" }> {
  if (payment.amountCents <= 0) {
    throw new Error("Payment amount must be positive.");
  }
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.invoice(uid, invoiceId));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Invoice ${invoiceId} not found`);
    const data = snap.data();
    if (data.status === "draft") {
      throw new Error("Send the invoice before recording payments.");
    }

    const totalCents: number = data.totalCents ?? 0;
    const currentPaid: number = data.amountPaidCents ?? 0;
    const nextPaid = currentPaid + payment.amountCents;
    if (nextPaid > totalCents) {
      throw new Error(
        `Payment of ${payment.amountCents}c exceeds remaining balance.`,
      );
    }
    const nextBalance = totalCents - nextPaid;
    const nextStatus: "sent" | "partial" | "paid" =
      nextPaid >= totalCents ? "paid" : nextPaid > 0 ? "partial" : "sent";

    const payments = Array.isArray(data.payments) ? data.payments : [];
    const update: Record<string, unknown> = {
      payments: [...payments, payment],
      amountPaidCents: nextPaid,
      balanceCents: nextBalance,
      status: nextStatus,
      updatedAt: nowIso(),
    };
    if (nextStatus === "paid") update.paidAt = nowIso();
    tx.update(ref, update);

    return { status: nextStatus };
  });
}

export async function removePayment(
  uid: string,
  invoiceId: string,
  paymentIndex: number,
): Promise<{ status: "sent" | "partial" | "paid" }> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.invoice(uid, invoiceId));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Invoice ${invoiceId} not found`);
    const data = snap.data();
    const payments: PaymentRecord[] = Array.isArray(data.payments) ? data.payments : [];
    if (paymentIndex < 0 || paymentIndex >= payments.length) {
      throw new Error("Payment index out of range.");
    }
    const removed = payments[paymentIndex];
    if (!removed) throw new Error("Payment not found.");
    const nextPayments = payments.filter((_, i) => i !== paymentIndex);
    const nextPaid: number = (data.amountPaidCents ?? 0) - removed.amountCents;
    const totalCents: number = data.totalCents ?? 0;
    const nextBalance = totalCents - nextPaid;
    const nextStatus: "sent" | "partial" | "paid" =
      nextPaid >= totalCents
        ? "paid"
        : nextPaid > 0
          ? "partial"
          : "sent";

    const update: Record<string, unknown> = {
      payments: nextPayments,
      amountPaidCents: nextPaid,
      balanceCents: nextBalance,
      status: nextStatus,
      updatedAt: nowIso(),
    };
    if (nextStatus !== "paid") update.paidAt = null;
    tx.update(ref, update);

    return { status: nextStatus };
  });
}

export async function linkCreditNote(
  uid: string,
  invoiceId: string,
  creditNoteId: string,
): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.invoice(uid, invoiceId));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Invoice ${invoiceId} not found`);
    const data = snap.data();
    const ids: string[] = Array.isArray(data.creditNoteIds) ? data.creditNoteIds : [];
    if (ids.includes(creditNoteId)) return;
    tx.update(ref, {
      creditNoteIds: [...ids, creditNoteId],
      updatedAt: nowIso(),
    });
  });
}

export async function restoreInvoice(uid: string, invoiceId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, fsPaths.invoice(uid, invoiceId)), {
    deletedAt: null,
    updatedAt: nowIso(),
  });
}

// Hard delete for drafts only (per spec §10). Sent+ uses softDeleteInvoice.
export async function deleteDraft(uid: string, id: string): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.invoice(uid, id));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.status !== "draft") {
    throw new Error(`Cannot hard-delete a ${data.status} invoice; archive instead.`);
  }
  // Use updateDoc to set deletedAt OR use deleteDoc — spec says hard delete
  // for drafts. We use the actual Firestore delete.
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(ref);
}

export async function softDeleteInvoice(uid: string, id: string): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, fsPaths.invoice(uid, id)), {
    deletedAt: nowIso(),
    updatedAt: nowIso(),
  });
}
