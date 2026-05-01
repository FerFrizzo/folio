/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light/dark surfaces — driven by CSS vars in global.css.
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",

        // Brand accent — same in both modes.
        accent: {
          DEFAULT: "#0B3D5C",
          hover: "#1B5A82",
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
        label: ["13px", { lineHeight: "18px", fontWeight: "500", letterSpacing: "0.2px" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
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
