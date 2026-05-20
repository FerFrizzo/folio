import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithCredential,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { useEffect } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

// expo-auth-session needs this called once at module init so the OAuth
// redirect closes the in-app browser cleanly on iOS / Android.
WebBrowser.maybeCompleteAuthSession();

// Google sign-in via expo-auth-session on native (iOS + Android), and via
// the Firebase Web SDK's signInWithPopup on web. Returns a Firebase User
// after linkWithCredential preserves the existing anonymous UID.

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export type GoogleLinkResult =
  | { ok: true; user: User }
  | { ok: false; reason: "no-user" | "cancelled" | "missing-config"; error?: unknown };

// React hook variant for native — useAuthRequest must run inside a component.
export function useGoogleAuth() {
  const config: {
    iosClientId?: string;
    androidClientId?: string;
    webClientId?: string;
    scopes?: string[];
    redirectUri?: string;
  } = { scopes: ["openid", "profile", "email"] };
  if (IOS_CLIENT_ID) config.iosClientId = IOS_CLIENT_ID;
  if (ANDROID_CLIENT_ID) config.androidClientId = ANDROID_CLIENT_ID;
  if (WEB_CLIENT_ID) config.webClientId = WEB_CLIENT_ID;

  // Explicitly set the redirect URI so it matches the authorized URI registered
  // in Google Cloud Console. The scheme mirrors the intent filter in app.config.ts
  // (android.intentFilters). Without this, expo-auth-session auto-generates a URI
  // that may not match, causing "Error 400: invalid_request" on Android.
  const redirectUri = makeRedirectUri({
    scheme: "com.googleusercontent.apps.792742422119-lhbh2o8p7u7bbdvfn1f482u5cdq76u5k",
    path: "oauth2redirect",
  });
  config.redirectUri = redirectUri;

  const [request, response, promptAsync] = Google.useAuthRequest(config);

  return { request, response, promptAsync };
}

// Helper that, given an idToken returned from useAuthRequest, runs the
// linkWithCredential flow and returns the new user.
export async function linkGoogleWithIdToken(idToken: string): Promise<GoogleLinkResult> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) return { ok: false, reason: "no-user" };

  const credential = GoogleAuthProvider.credential(idToken);
  try {
    const result = await linkWithCredential(current, credential);
    return { ok: true, user: result.user };
  } catch (error) {
    throw error;
  }
}

// Web path — uses Firebase's signInWithPopup directly. Does NOT need a
// separate auth-session round-trip.
export async function linkGoogleWeb(): Promise<GoogleLinkResult> {
  if (Platform.OS !== "web") {
    return { ok: false, reason: "missing-config" };
  }
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) return { ok: false, reason: "no-user" };

  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  const result = await linkWithPopup(current, provider);
  return { ok: true, user: result.user };
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export async function signInWithGoogleWeb(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export function googleConfigured(): boolean {
  if (Platform.OS === "ios") return !!IOS_CLIENT_ID;
  if (Platform.OS === "android") return !!ANDROID_CLIENT_ID;
  return !!WEB_CLIENT_ID;
}

// Re-export so callers can use the hook in a single import.
export { useEffect };
