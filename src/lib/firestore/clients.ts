import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import {
  ClientSchema,
  ClientInputSchema,
  type Client,
  type ClientInput,
} from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";

function nowIso(): string {
  return new Date().toISOString();
}

function toClient(data: Record<string, unknown>, id: string): Client | null {
  // Firestore Timestamps come back as Timestamp objects; coerce to ISO before
  // validating against the Zod schema.
  const normalized: Record<string, unknown> = { ...data, id };
  for (const k of ["createdAt", "updatedAt", "deletedAt"] as const) {
    const v = normalized[k];
    if (v instanceof Timestamp) normalized[k] = v.toDate().toISOString();
  }
  const parsed = ClientSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export async function listClients(uid: string): Promise<Client[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, fsPaths.clients(uid)),
    orderBy("name", "asc"),
  );
  const snap = await getDocs(q);
  const out: Client[] = [];
  for (const docSnap of snap.docs) {
    const c = toClient(docSnap.data(), docSnap.id);
    if (c && !c.deletedAt) out.push(c);
  }
  return out;
}

export async function getClient(uid: string, id: string): Promise<Client | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.client(uid, id)));
  if (!snap.exists()) return null;
  return toClient(snap.data(), snap.id);
}

export async function createClient(
  uid: string,
  input: ClientInput,
): Promise<Client> {
  ClientInputSchema.parse(input);
  const db = getFirebaseFirestore();
  const ref = doc(collection(db, fsPaths.clients(uid)));
  const createdAt = nowIso();
  const data = {
    ...input,
    createdAt,
    updatedAt: createdAt,
  };
  await setDoc(ref, data);
  return ClientSchema.parse({ id: ref.id, ...data });
}

export async function updateClient(
  uid: string,
  id: string,
  patch: Partial<ClientInput>,
): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, fsPaths.client(uid, id)), {
    ...patch,
    updatedAt: nowIso(),
  });
}

// Soft-delete with guardrail: if any non-deleted invoice references this
// client, return blocked + count and do nothing. Caller surfaces a toast.
export type DeleteClientResult =
  | { ok: true }
  | { ok: false; reason: "has-invoices"; count: number };

export async function softDeleteClient(
  uid: string,
  id: string,
): Promise<DeleteClientResult> {
  const db = getFirebaseFirestore();
  const refQ = query(
    collection(db, fsPaths.invoices(uid)),
    where("clientId", "==", id),
  );
  const snap = await getDocs(refQ);
  const liveInvoices = snap.docs.filter((d) => !d.data().deletedAt);
  if (liveInvoices.length > 0) {
    return { ok: false, reason: "has-invoices", count: liveInvoices.length };
  }
  await updateDoc(doc(db, fsPaths.client(uid, id)), {
    deletedAt: nowIso(),
    updatedAt: nowIso(),
  });
  return { ok: true };
}
