import { Platform } from "react-native";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

// Google sign-in via native SDK (@react-native-google-signin) on iOS + Android,
// and via Firebase's signInWithPopup on web.

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Native sign-in via Google Identity Services SDK. Returns a Firebase User.
export async function signInWithGoogleNative(): Promise<User> {
  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

  GoogleSignin.configure({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

// Web sign-in via Firebase popup.
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
