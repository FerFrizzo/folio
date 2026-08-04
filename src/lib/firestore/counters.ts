import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Transaction,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import { fsPaths } from "@/src/lib/firestore/paths";
import { formatAutoNumber } from "@/src/lib/numbering";
import { CounterDocSchema } from "@/src/types/schemas";

// Spec §4: counters are updated via Firestore transactions to prevent
// number-sequencing races. Callers either invoke claimNext* standalone or
// compose the in-transaction helpers into a larger transaction (see
// invoices.markSent and creditNotes.create).

export type ClaimedNumber = { counter: number; number: string };

export type ClaimOpts = {
  prefix?: string;
  minDigits?: number;
};

export async function claimNextInvoiceNumber(
  uid: string,
  opts: ClaimOpts = {},
): Promise<ClaimedNumber> {
  const db = getFirebaseFirestore();
  return runTransaction(db, async (tx) => {
    return claimNextInvoiceNumberInTransaction(tx, uid, opts);
  });
}

export async function claimNextInvoiceNumberInTransaction(
  tx: Transaction,
  uid: string,
  opts: ClaimOpts = {},
): Promise<ClaimedNumber> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.counters(uid));
  const snap = await tx.get(ref);

  const current = snap.exists()
    ? CounterDocSchema.parse(snap.data())
    : CounterDocSchema.parse({});
  const nextCounter = current.invoiceCounter + 1;

  if (snap.exists()) {
    tx.update(ref, { invoiceCounter: nextCounter });
  } else {
    tx.set(ref, { ...current, invoiceCounter: nextCounter });
  }

  return {
    counter: nextCounter,
    number: formatAutoNumber({
      prefix: opts.prefix ?? "INV-",
      counter: nextCounter,
      minDigits: opts.minDigits ?? 4,
    }),
  };
}

// Keep the auto counter ahead of a manually-set number so the next auto
// invoice never goes backwards or collides. No-op if the counter is already
// >= n. Compose inside markSent / updateInvoiceNumber transactions.
export async function ensureInvoiceCounterAtLeastInTransaction(
  tx: Transaction,
  uid: string,
  n: number,
): Promise<void> {
  if (!Number.isFinite(n) || n < 1) return;
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.counters(uid));
  const snap = await tx.get(ref);
  const current = snap.exists()
    ? CounterDocSchema.parse(snap.data())
    : CounterDocSchema.parse({});
  if (current.invoiceCounter >= n) return;
  if (snap.exists()) {
    tx.update(ref, { invoiceCounter: n });
  } else {
    tx.set(ref, { ...current, invoiceCounter: n });
  }
}

export async function claimNextCreditNoteNumberInTransaction(
  tx: Transaction,
  uid: string,
  opts: ClaimOpts = {},
): Promise<ClaimedNumber> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.counters(uid));
  const snap = await tx.get(ref);

  const current = snap.exists()
    ? CounterDocSchema.parse(snap.data())
    : CounterDocSchema.parse({});
  const nextCounter = current.creditNoteCounter + 1;

  if (snap.exists()) {
    tx.update(ref, { creditNoteCounter: nextCounter });
  } else {
    tx.set(ref, { ...current, creditNoteCounter: nextCounter });
  }

  return {
    counter: nextCounter,
    number: formatAutoNumber({
      prefix: opts.prefix ?? "CN-",
      counter: nextCounter,
      minDigits: opts.minDigits ?? 4,
    }),
  };
}

// ---------- plain reads/writes (settings UI, editor suggestion) ----------

// The invoice counter as it stands right now. This is the value the allocation
// transaction reads, unlike settings.numbering.counter, which nothing reads.
// Advisory for callers: by the time an invoice is sent, markSent claims inside
// a transaction, so a stale read here only makes a stale suggestion.
export async function getInvoiceCounter(uid: string): Promise<number> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.counters(uid)));
  if (!snap.exists()) return 0;
  return CounterDocSchema.parse(snap.data()).invoiceCounter;
}

// Set the counter directly — used by the Settings numbering card, where the
// user is deliberately choosing where the sequence resumes. Merges so the
// credit-note counter in the same document is left alone.
export async function setInvoiceCounter(uid: string, value: number): Promise<void> {
  const db = getFirebaseFirestore();
  const invoiceCounter = Math.max(0, Math.floor(value));
  await setDoc(
    doc(db, fsPaths.counters(uid)),
    { invoiceCounter },
    { merge: true },
  );
}
