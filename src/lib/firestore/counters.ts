import { doc, runTransaction, type Transaction } from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import { fsPaths } from "@/src/lib/firestore/paths";
import { formatAutoNumber } from "@/src/lib/numbering";
import { CounterDocSchema } from "@/src/types/schemas";

// Spec §4: counters are updated via Firestore transactions to prevent
// number-sequencing races. claimNextInvoiceNumber must run inside a
// transaction; callers either invoke it standalone or compose it into a
// larger transaction (see invoices.markSent below).

export async function claimNextInvoiceNumber(
  uid: string,
  prefix: string = "INV-",
): Promise<{ counter: number; number: string }> {
  const db = getFirebaseFirestore();
  return runTransaction(db, async (tx) => {
    return claimNextInvoiceNumberInTransaction(tx, uid, prefix);
  });
}

// Internal: run the counter increment inside an existing transaction so
// markSent can atomically claim a number AND lock the invoice in one write.
export async function claimNextInvoiceNumberInTransaction(
  tx: Transaction,
  uid: string,
  prefix: string,
): Promise<{ counter: number; number: string }> {
  const db = getFirebaseFirestore();
  const ref = doc(db, fsPaths.counters(uid));
  const snap = await tx.get(ref);

  const current = snap.exists()
    ? CounterDocSchema.parse(snap.data())
    : CounterDocSchema.parse({});
  const nextCounter = current.invoiceCounter + 1;
  const next = { ...current, invoiceCounter: nextCounter };

  if (snap.exists()) {
    tx.update(ref, { invoiceCounter: nextCounter });
  } else {
    tx.set(ref, next);
  }

  return {
    counter: nextCounter,
    number: formatAutoNumber({ prefix, counter: nextCounter }),
  };
}
