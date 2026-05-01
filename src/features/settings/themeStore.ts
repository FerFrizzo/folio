import { create } from "zustand";
import { colorScheme } from "nativewind";
import { Platform } from "react-native";

// Theme override store. spec §13 Settings: Theme (System/Light/Dark).
// "system" follows OS appearance; "light" / "dark" force the override.
// NativeWind's `colorScheme` API drives the actual class swap.

type Mode = "system" | "light" | "dark";

type State = {
  mode: Mode;
  setMode: (mode: Mode) => void;
};

// nativewind's colorScheme.set throws during web SSR (no document). Skip it
// when we're being pre-rendered in Node; the client effect will re-apply.
const canApply = Platform.OS !== "web" || typeof window !== "undefined";

function applyMode(mode: Mode) {
  if (!canApply) return;
  if (mode === "system") {
    colorScheme.set("system");
  } else {
    colorScheme.set(mode);
  }
}

applyMode("system");

export const useThemeStore = create<State>((set) => ({
  mode: "system",
  setMode: (mode) => {
    applyMode(mode);
    set({ mode });
  },
}));
