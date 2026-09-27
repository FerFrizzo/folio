import { create } from "zustand";
import { deviceStorage } from "@/src/lib/deviceStorage";

// Onboarding state — tracks whether the dashboard banner has been dismissed.
// Persisted per device via deviceStorage (SecureStore on native, localStorage
// on web) so it survives app restart. Spec §13: skipped fields surface as a
// dismissible dashboard banner.

const KEY = "folio.onboarding.dismissed";

type State = {
  dismissed: boolean;
  hydrate: () => Promise<void>;
  dismiss: () => void;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<State>((set) => ({
  dismissed: false,
  hydrate: async () => {
    const dismissed = (await deviceStorage.getItem(KEY)) === "1";
    set({ dismissed });
  },
  dismiss: () => {
    void deviceStorage.setItem(KEY, "1");
    set({ dismissed: true });
  },
  reset: async () => {
    await deviceStorage.removeItem(KEY);
    set({ dismissed: false });
  },
}));
