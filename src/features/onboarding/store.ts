import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Onboarding state — tracks whether the dashboard banner has been dismissed.
// Persisted to SecureStore on native, localStorage on web (so it survives app
// restart). Spec §13: skipped fields surface as a dismissible dashboard banner.

const KEY = "folio.onboarding.dismissed";
const isWeb = Platform.OS === "web";

async function persistDismiss(): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, "1");
    return;
  }
  await SecureStore.setItemAsync(KEY, "1");
}

async function loadDismissed(): Promise<boolean> {
  if (isWeb) {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEY) === "1";
  }
  const v = await SecureStore.getItemAsync(KEY);
  return v === "1";
}

type State = {
  dismissed: boolean;
  hydrate: () => Promise<void>;
  dismiss: () => void;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<State>((set) => ({
  dismissed: false,
  hydrate: async () => {
    const dismissed = await loadDismissed();
    set({ dismissed });
  },
  dismiss: () => {
    void persistDismiss();
    set({ dismissed: true });
  },
  reset: async () => {
    if (isWeb) {
      if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
    set({ dismissed: false });
  },
}));
