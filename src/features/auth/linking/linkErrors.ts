import type { AuthErrorKind, AuthMethod } from "@/src/lib/analytics";

// Friendly mapping for Firebase auth-error codes from the login screen and
// linkWithCredential flows. The Firebase SDK throws an error with a `code`
// field; we surface human-readable messages instead of the raw codes (or the
// raw "Firebase: Error (auth/...)" text) so the user knows what to do next.
// Native Google Sign-In and expo-apple-authentication errors carry their own
// codes, mapped below too; google.ts/apple.ts throw "google/…"/"apple/…" codes
// for failures the SDKs report as results instead of errors.

export type LinkErrorKind = AuthErrorKind;

type FirebaseAuthError = { code?: string | number; message?: string };

const PROVIDER_NAME: Record<AuthMethod, string> = {
  email: "email",
  google: "Google",
  apple: "Apple",
};

export function classifyLinkError(
  error: unknown,
  method: AuthMethod = "email",
): {
  kind: LinkErrorKind;
  message: string;
} {
  const err = error as FirebaseAuthError;
  const code = String(err?.code ?? "");

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
        message:
          method === "email"
            ? "Email or password is incorrect."
            : `Couldn't verify your ${PROVIDER_NAME[method]} account. Try again.`,
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
    case "google/cancelled":
    case "12501": // Android GoogleSignInStatusCodes.SIGN_IN_CANCELLED
    case "-5": // iOS kGIDSignInErrorCodeCanceled
    case "ERR_REQUEST_CANCELED":
      return { kind: "cancelled", message: "Sign-in was cancelled." };
    case "10": // Android DEVELOPER_ERROR: app signature not registered with Google
      return {
        kind: "provider-misconfigured",
        message: `${PROVIDER_NAME[method]} sign-in isn't working right now. Use email to sign in for now.`,
      };
    case "PLAY_SERVICES_NOT_AVAILABLE":
      return {
        kind: "play-services",
        message: "Google sign-in needs Google Play services. Update them or use email instead.",
      };
    case "google/no-id-token":
    case "apple/no-identity-token":
    case "12500": // Android SIGN_IN_FAILED
    case "NULL_PRESENTER":
    case "ERR_REQUEST_FAILED":
    case "ERR_REQUEST_UNKNOWN":
    case "ERR_REQUEST_NOT_HANDLED":
    case "ERR_REQUEST_INVALID_RESPONSE":
    case "ERR_REQUEST_NOT_INTERACTIVE":
      return {
        kind: "provider-failed",
        message: `${PROVIDER_NAME[method]} sign-in didn't complete. Try again, or use email instead.`,
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

// The error's code for analytics. Codes are short identifiers; anything else
// (including a code that looks like free text) is replaced so a message can
// never leak into an event.
export function safeErrorCode(error: unknown): string {
  const code = (error as FirebaseAuthError | undefined)?.code;
  if (typeof code !== "string" && typeof code !== "number") return "none";
  const text = String(code);
  return /^[A-Za-z0-9_/.-]{1,64}$/.test(text) ? text : "other";
}
