import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { track, type AuthMethod } from "@/src/lib/analytics";

// Google and Apple use one call for both sign-up and sign-in; Firebase tells us
// which it was via additionalUserInfo.isNewUser.
export function trackAuthResult(result: UserCredential, method: AuthMethod): void {
  try {
    const isNew = getAdditionalUserInfo(result)?.isNewUser === true;
    track(isNew ? "signed_up" : "signed_in", { method });
  } catch {
    // Analytics must never break sign-in.
  }
}
