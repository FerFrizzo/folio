import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Phase 1: PIN salt + hash live locally — Keychain/Keystore on native,
// localStorage on web. expo-secure-store has no web implementation, so we
// branch here. Treat web PIN as a UX layer, not a security boundary; the real
// protection is Firestore rules + biometric on native.
// Phase 2 will mirror pinHash into users/{uid}/settings.pinHash for Cloud sync.

const SALT_KEY = "folio.pin.salt";
const HASH_KEY = "folio.pin.hash";

const PIN_RE = /^\d{4,6}$/;

const isWeb = Platform.OS === "web";

async function storeGet(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function storeSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storeDelete(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function getRandomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) {
    throw new Error("PIN must be 4–6 digits.");
  }
  const salt = getRandomSalt();
  const hash = await hashPin(pin, salt);
  await storeSet(SALT_KEY, salt);
  await storeSet(HASH_KEY, hash);
}

export async function clearPin(): Promise<void> {
  await storeDelete(SALT_KEY);
  await storeDelete(HASH_KEY);
}

export async function hasPin(): Promise<boolean> {
  const hash = await storeGet(HASH_KEY);
  return Boolean(hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const salt = await storeGet(SALT_KEY);
  const expected = await storeGet(HASH_KEY);
  if (!salt || !expected) return false;
  const actual = await hashPin(pin, salt);
  return actual === expected;
}

export const Platform_supportsBiometric = Platform.OS !== "web";
