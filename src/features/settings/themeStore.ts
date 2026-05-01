import { create } from "zustand";
import { colorScheme } from "nativewind";

// Theme override store. spec §13 Settings: Theme (System/Light/Dark).
// "system" follows OS appearance; "light" / "dark" force the override.
// NativeWind's `colorScheme` API drives the actual class swap.

type Mode = "system" | "light" | "dark";

type State = {
  mode: Mode;
  setMode: (mode: Mode) => void;
};

function applyMode(mode: Mode) {
  if (mode === "system") {
    colorScheme.set("system");
  } else {
    colorScheme.set(mode);
  }
}

// Apply default once on module load to follow system.
applyMode("system");

export const useThemeStore = create<State>((set) => ({
  mode: "system",
  setMode: (mode) => {
    applyMode(mode);
    set({ mode });
  },
}));
