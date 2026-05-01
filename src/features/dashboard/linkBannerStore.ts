import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "folio.linkBanner.dismissedAt";
const isWeb = Platform.OS === "web";

async function persistDismissedAt(at: number): Promise<void> {
  if (isWeb) {
    if (typeof window !== "undefined")
      window.localStorage.setItem(KEY, String(at));
    return;
  }
  await SecureStore.setItemAsync(KEY, String(at));
}

async function load(): Promise<number | null> {
  if (isWeb) {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(KEY);
    return v ? Number(v) : null;
  }
  const v = await SecureStore.getItemAsync(KEY);
  return v ? Number(v) : null;
}

type State = {
  dismissedAt: number | null;
  hydrate: () => Promise<void>;
  dismiss: () => void;
};

export const useLinkBannerStore = create<State>((set) => ({
  dismissedAt: null,
  hydrate: async () => {
    const v = await load();
    set({ dismissedAt: v });
  },
  dismiss: () => {
    const at = Date.now();
    void persistDismissedAt(at);
    set({ dismissedAt: at });
  },
}));
