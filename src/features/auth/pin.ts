import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Phase 1: PIN salt + hash both live locally in SecureStore (web uses
// localStorage via expo-secure-store's web shim — treat web PIN as a UX layer,
// not a security boundary; the real protection is Firestore rules + biometric).
// Phase 2 will mirror pinHash into users/{uid}/settings.pinHash for Cloud sync.

const SALT_KEY = "folio.pin.salt";
const HASH_KEY = "folio.pin.hash";

const PIN_RE = /^\d{4,6}$/;

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
  // SecureStore on web falls back to localStorage; on native uses Keychain/Keystore.
  await SecureStore.setItemAsync(SALT_KEY, salt);
  await SecureStore.setItemAsync(HASH_KEY, hash);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(SALT_KEY);
  await SecureStore.deleteItemAsync(HASH_KEY);
}

export async function hasPin(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(HASH_KEY);
  return Boolean(hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  const expected = await SecureStore.getItemAsync(HASH_KEY);
  if (!salt || !expected) return false;
  const actual = await hashPin(pin, salt);
  return actual === expected;
}

export const Platform_supportsBiometric = Platform.OS !== "web";
