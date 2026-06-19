/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light/dark surfaces — driven by CSS vars in global.css.
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",

        // Brand accent — same in both modes.
        accent: {
          DEFAULT: "#1473FF",
          hover: "#0A5CE8",
        },

        // Status colors — same in both modes; chips/badges use 12% alpha bg.
        status: {
          paid: "#0F8A5F",
          sent: "#C77A0A",
          overdue: "#C0392B",
          partial: "#1F6FB2",
          draft: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Spec §13 typography scale.
        display: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        label: ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0.2px" }],
        caption: ["13px", { lineHeight: "18px", fontWeight: "400" }],
      },
      spacing: {
        // 4px base scale already covers 1–12; nothing to extend.
      },
      borderRadius: {
        card: "12px",
        button: "10px",
        chip: "999px",
      },
    },
  },
  plugins: [],
};
