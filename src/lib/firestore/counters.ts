import { doc, runTransaction, type Transaction } from "firebase/firestore";
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
