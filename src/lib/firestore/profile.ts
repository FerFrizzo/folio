import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import { ProfileSchema, type Profile } from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";

export async function getProfile(uid: string): Promise<Profile | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.profile(uid)));
  if (!snap.exists()) return null;
  const parsed = ProfileSchema.safeParse(snap.data());
  if (!parsed.success) {
    // Don't throw on malformed legacy docs — return null and let the UI
    // re-prompt onboarding. Throwing would brick the app on a bad write.
    return null;
  }
  return parsed.data;
}

export async function setProfile(uid: string, profile: Profile): Promise<void> {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, fsPaths.profile(uid)), profile, { merge: true });
}
