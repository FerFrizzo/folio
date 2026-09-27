import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { track } from "@/src/lib/analytics";

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  track("signed_in", { method: "email" });
  return result.user;
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  track("signed_up", { method: "email" });
  return result.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}
