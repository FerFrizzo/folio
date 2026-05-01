import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import { SettingsSchema, type Settings } from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";

export async function getSettings(uid: string): Promise<Settings> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.settings(uid)));
  if (!snap.exists()) {
    // Return defaults; the document is created on first save.
    return SettingsSchema.parse({});
  }
  const parsed = SettingsSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : SettingsSchema.parse({});
}

export async function setSettings(uid: string, settings: Settings): Promise<void> {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, fsPaths.settings(uid)), settings, { merge: true });
}
