import type { PaywallSource } from "@/src/lib/analytics/events";

export const PAYWALL_SOURCES: readonly PaywallSource[] = [
  "onboarding",
  "invoice_send",
  "watermark",
  "dashboard_banner",
  "settings",
  "unknown",
];

// The source arrives as a route query param, so it is untrusted input.
export function parsePaywallSource(value: string | string[] | undefined): PaywallSource {
  if (typeof value !== "string") return "unknown";
  return (PAYWALL_SOURCES as readonly string[]).includes(value)
    ? (value as PaywallSource)
    : "unknown";
}
