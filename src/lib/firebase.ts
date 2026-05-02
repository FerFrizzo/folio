import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // getReactNativePersistence is only exposed on the React Native build of
  // @firebase/auth. Metro resolves it correctly; TypeScript's published types
  // omit it because they describe the browser build. The runtime import works
  // on native, so we silence the type error rather than ship a separate file.
  // @ts-expect-error - getReactNativePersistence is RN-only at the type level
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import { Platform } from "react-native";

// Firebase Web SDK config — values live in .env (EXPO_PUBLIC_FIREBASE_*).
// EXPO_PUBLIC_* vars are inlined at build time and are public by definition;
// real secrets must live only in Cloud Functions environment.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;

function ensureApp(): FirebaseApp {
  if (!isConfigured) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env and fill in EXPO_PUBLIC_FIREBASE_* values.",
    );
  }
  if (_app) return _app;
  _app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
  return _app;
}

export function getFirebaseApp(): FirebaseApp {
  return ensureApp();
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = ensureApp();
  // Web uses default IndexedDB persistence. Native uses AsyncStorage so the
  // anonymous UID survives app restarts — non-negotiable for an offline-first
  // invoicing app. initializeAuth must run exactly once; if it has already run
  // (hot reload), getAuth returns the existing instance.
  if (Platform.OS === "web") {
    _auth = getAuth(app);
  } else {
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      _auth = getAuth(app);
    }
  }
  return _auth;
}

export function getFirebaseFirestore(): Firestore {
  if (_firestore) return _firestore;
  _firestore = getFirestore(ensureApp());
  return _firestore;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  return _storage;
}

// Cloud Functions are deployed to australia-southeast1 (matching Phase 4's
// callable region). The client must use the same region or the call fails
// with `not-found`.
export function getFirebaseFunctions(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(ensureApp(), "australia-southeast1");
  return _functions;
}

export function isFirebaseConfigured(): boolean {
  return isConfigured;
}
