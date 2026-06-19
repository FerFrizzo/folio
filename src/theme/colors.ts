// Mirror of tailwind.config.js color tokens for use in places that don't go
// through className (StatusBar tint, native splash, swipe-action backgrounds,
// inline styles). Keep in sync with tailwind.config.js + global.css.

export const Accent = {
  DEFAULT: "#1473FF",
  hover: "#0A5CE8",
} as const;

export const Status = {
  paid: "#0F8A5F",
  sent: "#C77A0A",
  overdue: "#C0392B",
  partial: "#1F6FB2",
  draft: "#6B7280",
} as const;

export const Light = {
  background: "#FAFAF7",
  surface: "#FFFFFF",
  border: "#E5E5E0",
  foreground: "#111827",
  muted: "#4B5563",
} as const;


export type StatusKey = keyof typeof Status;
