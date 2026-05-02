// Friendly mapping for Firebase auth-error codes encountered during
// linkWithCredential flows. The Firebase SDK throws an error with a `code`
// field; we surface human-readable messages instead of the raw codes so the
// user knows what to do next.

export type LinkErrorKind =
  | "credential-in-use"
  | "email-in-use"
  | "popup-closed"
  | "network"
  | "unsupported-platform"
  | "cancelled"
  | "unknown";

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
        message:
          "That email is already in use. Try a different account or sign out first.",
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
        message:
          err?.message ?? "Something went wrong. Try again in a moment.",
      };
  }
}
