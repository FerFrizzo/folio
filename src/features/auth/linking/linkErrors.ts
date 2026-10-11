import type { AuthErrorKind } from "@/src/lib/analytics";

// Friendly mapping for Firebase auth-error codes from the login screen and
// linkWithCredential flows. The Firebase SDK throws an error with a `code`
// field; we surface human-readable messages instead of the raw codes (or the
// raw "Firebase: Error (auth/...)" text) so the user knows what to do next.

export type LinkErrorKind = AuthErrorKind;

type FirebaseAuthError = { code?: string; message?: string };

export function classifyLinkError(error: unknown): {
  kind: LinkErrorKind;
  message: string;
} {
  const err = error as FirebaseAuthError;
  const code = err?.code ?? "";

  switch (code) {
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
      return {
        kind: "credential-in-use",
        message:
          "That account is already linked to another Folio install. Sign out first to switch.",
      };
    case "auth/email-already-in-use":
      return {
        kind: "email-in-use",
        message: "An account with this email already exists. Try signing in instead.",
      };
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return {
        kind: "wrong-credentials",
        message: "Email or password is incorrect.",
      };
    case "auth/invalid-email":
      return { kind: "invalid-email", message: "Enter a valid email address." };
    case "auth/weak-password":
      return {
        kind: "weak-password",
        message: "Choose a stronger password — at least 8 characters.",
      };
    case "auth/too-many-requests":
      return {
        kind: "too-many-requests",
        message: "Too many attempts. Wait a few minutes or reset your password.",
      };
    case "auth/user-disabled":
      return {
        kind: "user-disabled",
        message: "This account has been disabled. Contact support for help.",
      };
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return {
        kind: "popup-closed",
        message: "Sign-in was cancelled.",
      };
    case "auth/network-request-failed":
      return {
        kind: "network",
        message: "Couldn't reach the server. Check your connection and try again.",
      };
    case "auth/operation-not-supported-in-this-environment":
    case "auth/unsupported-persistence-type":
      return {
        kind: "unsupported-platform",
        message: "Sign-in isn't available on this device. Try a different device.",
      };
    default:
      if (
        typeof err?.message === "string" &&
        /cancel/i.test(err.message)
      ) {
        return { kind: "cancelled", message: "Sign-in was cancelled." };
      }
      return {
        kind: "unknown",
        message: "Something went wrong. Try again in a moment.",
      };
  }
}
