import { create } from "zustand";

type State = {
  dismissedForSession: boolean;
  dismiss: () => void;
};

// Session-only dismiss — no persistence. The banner re-appears each app launch
// for free users so the upgrade path stays discoverable.
export const useSubscriptionBannerStore = create<State>((set) => ({
  dismissedForSession: false,
  dismiss: () => set({ dismissedForSession: true }),
}));
