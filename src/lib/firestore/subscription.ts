import { doc, getDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/src/lib/firebase";
import { SubscriptionSchema, type Subscription } from "@/src/types/schemas";
import { fsPaths } from "@/src/lib/firestore/paths";

export async function getSubscription(uid: string): Promise<Subscription | null> {
  const db = getFirebaseFirestore();
  const snap = await getDoc(doc(db, fsPaths.subscription(uid)));
  if (!snap.exists()) return null;
  const parsed = SubscriptionSchema.safeParse(snap.data());
  if (!parsed.success) return null;
  return parsed.data;
}
