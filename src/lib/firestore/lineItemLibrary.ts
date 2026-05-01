import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import {
  LineItemLibraryEntrySchema,
  type LineItemLibraryEntry,
  type LineItemLibraryInput,
} from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";

function nowIso(): string {
  return new Date().toISOString();
}

function toEntry(data: Record<string, unknown>, id: string): LineItemLibraryEntry | null {
  const normalized: Record<string, unknown> = { ...data, id };
  const v = normalized.createdAt;
  if (v instanceof Timestamp) normalized.createdAt = v.toDate().toISOString();
  const parsed = LineItemLibraryEntrySchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export async function listLibraryEntries(uid: string): Promise<LineItemLibraryEntry[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, fsPaths.lineItemLibrary(uid)),
    orderBy("description", "asc"),
  );
  const snap = await getDocs(q);
  const out: LineItemLibraryEntry[] = [];
  for (const d of snap.docs) {
    const e = toEntry(d.data(), d.id);
    if (e) out.push(e);
  }
  return out;
}

export async function getLibraryEntry(
  uid: string,
  id: string,
): Promise<LineItemLibraryEntry | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.lineItemLibraryEntry(uid, id)));
  if (!snap.exists()) return null;
  return toEntry(snap.data(), snap.id);
}

export async function createLibraryEntry(
  uid: string,
  input: LineItemLibraryInput,
): Promise<LineItemLibraryEntry> {
  const db = getFirebaseFirestore();
  const ref = doc(collection(db, fsPaths.lineItemLibrary(uid)));
  const data = {
    ...input,
    createdAt: nowIso(),
  };
  await setDoc(ref, data);
  return LineItemLibraryEntrySchema.parse({ id: ref.id, ...data });
}

export async function updateLibraryEntry(
  uid: string,
  id: string,
  patch: Partial<LineItemLibraryInput>,
): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, fsPaths.lineItemLibraryEntry(uid, id)), patch);
}

export async function deleteLibraryEntry(uid: string, id: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, fsPaths.lineItemLibraryEntry(uid, id)));
}
