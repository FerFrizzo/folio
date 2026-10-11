import config from "@/tailwind.config";

// Folio has no dark mode: themeStore forces light with colorScheme.set(), which
// NativeWind only allows when darkMode is "class". The default ("media") makes
// the web build crash on startup.
it("uses class-based dark mode so the app can force light mode", () => {
  expect((config as { darkMode?: unknown }).darkMode).toBe("class");
});
