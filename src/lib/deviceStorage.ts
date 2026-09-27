import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Small per-device key/value store: SecureStore on native, localStorage on
// web (so values survive restarts). Same split as features/onboarding/store.ts.
// Keys must match SecureStore's allowed charset: [A-Za-z0-9._-].

const isWeb = Platform.OS === "web";

export const deviceStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
