import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  OAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithCredential,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/src/lib/firebase";

// Apple sign-in + linkWithCredential. Spec §8: preserve the existing
// anonymous UID and all data when linking.
//
// Native iOS uses the proper Apple SDK. Native Android has no Apple SDK
// (Apple-by-design) and would require an OAuth-redirect dance — out of
// scope for the Phase 5 scope. The banner hides the Apple button on
// Android; this module returns "unsupported" if called there anyway.
//
// Web uses Firebase's signInWithPopup against the Apple OAuth provider.

const PROVIDER_ID = "apple.com";

export type AppleLinkResult =
  | { ok: true; user: User; alreadyLinked?: boolean }
  | { ok: false; reason: "unsupported" | "not-available" | "no-user"; error?: unknown };

async function generateNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = Crypto.getRandomBytes(16);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw,
  );
  return { raw, hashed };
}

export async function linkApple(): Promise<AppleLinkResult> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) return { ok: false, reason: "no-user" };

  if (Platform.OS === "web") {
    const provider = new OAuthProvider(PROVIDER_ID);
    provider.addScope("email");
    provider.addScope("name");
    try {
      const result = await linkWithPopup(current, provider);
      return { ok: true, user: result.user };
    } catch (error) {
      throw error;
    }
  }

  if (Platform.OS !== "ios") {
    return { ok: false, reason: "unsupported" };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) return { ok: false, reason: "not-available" };

  const { raw, hashed } = await generateNonce();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });

  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const provider = new OAuthProvider(PROVIDER_ID);
  const oauthCredential = provider.credential({
    idToken: credential.identityToken,
    rawNonce: raw,
  });

  try {
    const result = await linkWithCredential(current, oauthCredential);
    return { ok: true, user: result.user };
  } catch (error) {
    // If the credential is already in use, callers see auth/credential-
    // already-in-use; we could fall back to signInWithCredential to
    // switch into that account, but that would drop the current
    // anonymous UID's data — left for the banner's confirm flow.
    throw error;
  }
}

export async function signInWithApple(): Promise<User> {
  // Used as a "switch account" fallback when linking conflicts. Drops the
  // current anonymous UID; caller must already have warned the user.
  const auth = getFirebaseAuth();

  if (Platform.OS === "web") {
    const provider = new OAuthProvider(PROVIDER_ID);
    provider.addScope("email");
    const { signInWithPopup } = await import("firebase/auth");
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  if (Platform.OS !== "ios") {
    throw new Error("Apple sign-in is only supported on iOS and Web.");
  }

  const { raw, hashed } = await generateNonce();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });
  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const provider = new OAuthProvider(PROVIDER_ID);
  const oauthCredential = provider.credential({
    idToken: credential.identityToken,
    rawNonce: raw,
  });
  const result = await signInWithCredential(auth, oauthCredential);
  return result.user;
}

export function appleAvailableOnPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "web";
}
