import type { firestore } from "firebase-admin";
import { adminDb } from "./admin";
import { CounterDocSchema, type Settings } from "./types";

function formatAutoNumber(counter: number, prefix: string, minDigits: number): string {
  return `${prefix}${counter.toString().padStart(minDigits, "0")}`;
}

export async function claimNextInvoiceNumberInTx(
  tx: firestore.Transaction,
  uid: string,
  settings: Settings,
): Promise<{ counter: number; number: string }> {
  const ref = adminDb().doc(`users/${uid}/counters/main`);
  const snap = await tx.get(ref);
  const current = snap.exists
    ? CounterDocSchema.parse(snap.data())
    : CounterDocSchema.parse({});
  const nextCounter = current.invoiceCounter + 1;

  if (snap.exists) {
    tx.update(ref, { invoiceCounter: nextCounter });
  } else {
    tx.set(ref, { ...current, invoiceCounter: nextCounter });
  }

  const { prefix, minDigits } = settings.numbering;
  return { counter: nextCounter, number: formatAutoNumber(nextCounter, prefix, minDigits) };
}
