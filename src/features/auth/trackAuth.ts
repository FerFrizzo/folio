import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { track, type AuthMethod } from "@/src/lib/analytics";
import { classifyLinkError, safeErrorCode } from "@/src/features/auth/linking/linkErrors";

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

// Classifies a failed sign-in/sign-up, records it, and returns the message to
// show, or null when the user cancelled and there's nothing to say. Only the
// classified reason and the error code are sent — never the message.
export function reportAuthError(error: unknown, method: AuthMethod): string | null {
  const { kind, message } = classifyLinkError(error, method);
  try {
    track("sign_in_failed", { method, reason: kind, code: safeErrorCode(error) });
  } catch {
    // Analytics must never break sign-in.
  }
  return kind === "cancelled" || kind === "popup-closed" ? null : message;
}
