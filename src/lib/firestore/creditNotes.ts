import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import {
  CreditNoteSchema,
  type CreditNote,
  type CreditNoteInput,
} from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";
import { claimNextCreditNoteNumberInTransaction } from "@/src/lib/firestore/counters";

function nowIso(): string {
  return new Date().toISOString();
}

function toCreditNote(data: Record<string, unknown>, id: string): CreditNote | null {
  const normalized: Record<string, unknown> = { ...data, id };
  for (const k of ["createdAt", "updatedAt", "deletedAt"] as const) {
    const v = normalized[k];
    if (v instanceof Timestamp) normalized[k] = v.toDate().toISOString();
  }
  const parsed = CreditNoteSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export async function listCreditNotes(uid: string, includeDeleted = false): Promise<CreditNote[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, fsPaths.creditNotes(uid)),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  const out: CreditNote[] = [];
  for (const d of snap.docs) {
    const cn = toCreditNote(d.data(), d.id);
    if (!cn) continue;
    if (!includeDeleted && cn.deletedAt) continue;
    out.push(cn);
  }
  return out;
}

export async function listCreditNotesForInvoice(
  uid: string,
  invoiceId: string,
): Promise<CreditNote[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, fsPaths.creditNotes(uid)),
    where("originalInvoiceId", "==", invoiceId),
  );
  const snap = await getDocs(q);
  const out: CreditNote[] = [];
  for (const d of snap.docs) {
    const cn = toCreditNote(d.data(), d.id);
    if (cn && !cn.deletedAt) out.push(cn);
  }
  return out;
}

export async function getCreditNote(uid: string, id: string): Promise<CreditNote | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.creditNote(uid, id)));
  if (!snap.exists()) return null;
  return toCreditNote(snap.data(), snap.id);
}

// Issue a credit note in one shot. Atomically: claim CN counter, write the
// CN doc, link to the original invoice's creditNoteIds. Failures roll back
// all three writes.
export async function createCreditNote(
  uid: string,
  input: CreditNoteInput,
): Promise<CreditNote> {
  const db = getFirebaseFirestore();
  const ref = doc(collection(db, fsPaths.creditNotes(uid)));
  const invoiceRef = doc(db, fsPaths.invoice(uid, input.originalInvoiceId));
  const settingsRef = doc(db, fsPaths.settings(uid));

  const created: CreditNote = await runTransaction(db, async (tx) => {
    const [invSnap, settingsSnap] = await Promise.all([
      tx.get(invoiceRef),
      tx.get(settingsRef),
    ]);
    if (!invSnap.exists()) throw new Error("Original invoice not found.");

    // CN prefix uses a fixed "CN-" until/unless we add a separate setting in
    // Phase 4+. minDigits mirrors the invoice numbering minDigits so the
    // visual format stays consistent across both document types.
    const numbering = settingsSnap.exists()
      ? (settingsSnap.data().numbering ?? {})
      : {};
    const minDigits: number =
      typeof numbering.minDigits === "number" ? numbering.minDigits : 4;

    const { number } = await claimNextCreditNoteNumberInTransaction(tx, uid, {
      prefix: "CN-",
      minDigits,
    });

    // Compute totals from line items (already pre-enriched by caller).
    let subtotalCents = 0;
    let gstTotalCents = 0;
    let totalCents = 0;
    for (const l of input.lineItems) {
      subtotalCents += l.taxableCents;
      gstTotalCents += l.gstAmountCents;
      totalCents += l.lineTotalCents;
    }

    const createdAt = nowIso();
    const data = {
      number,
      originalInvoiceId: input.originalInvoiceId,
      originalInvoiceNumber: input.originalInvoiceNumber,
      currency: input.currency,
      clientSnapshot: input.clientSnapshot,
      issueDate: input.issueDate,
      reason: input.reason,
      lineItems: input.lineItems,
      subtotalCents,
      gstTotalCents,
      totalCents,
      createdAt,
      updatedAt: createdAt,
    };
    tx.set(ref, data);

    // Link to original invoice.
    const existingIds: string[] = Array.isArray(invSnap.data().creditNoteIds)
      ? invSnap.data().creditNoteIds
      : [];
    tx.update(invoiceRef, {
      creditNoteIds: [...existingIds, ref.id],
      updatedAt: createdAt,
    });

    return CreditNoteSchema.parse({ id: ref.id, ...data });
  });

  return created;
}

export async function softDeleteCreditNote(uid: string, id: string): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, fsPaths.creditNote(uid, id)), {
    deletedAt: nowIso(),
    updatedAt: nowIso(),
  });
}
