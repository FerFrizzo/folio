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
  const totals = computeInvoiceTotals(input.lineItems);
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
    subtotalCents: totals.subtotalCents,
    discountTotalCents: 0,
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
  if (patch.lineItems) {
    const totals = computeInvoiceTotals(patch.lineItems);
    update.subtotalCents = totals.subtotalCents;
    update.gstTotalCents = totals.gstTotalCents;
    update.totalCents = totals.totalCents;
    update.balanceCents = totals.totalCents; // Phase 2: no payments yet
  }
  await updateDoc(ref, update);
}

// Atomically: claim the next invoice number from the user's counter, set
// status to "sent", stamp sentAt, lock the invoice. Failures (network, race)
// roll back both writes.
export async function markSent(
  uid: string,
  id: string,
  prefix: string = "INV-",
): Promise<{ number: string }> {
  const db = getFirebaseFirestore();
  const invRef = doc(db, fsPaths.invoice(uid, id));

  return runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists()) {
      throw new Error(`Invoice ${id} not found`);
    }
    const data = invSnap.data();
    if (data.status !== "draft") {
      throw new Error(`Invoice ${id} is not a draft (status=${data.status})`);
    }
    const { number } = await claimNextInvoiceNumberInTransaction(tx, uid, prefix);
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
