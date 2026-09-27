import { PAYWALL_SOURCES, parsePaywallSource } from "@/src/lib/analytics/paywallSource";

describe("parsePaywallSource", () => {
  it.each(PAYWALL_SOURCES)("accepts %s", (source) => {
    expect(parsePaywallSource(source)).toBe(source);
  });
  it("maps a missing value to unknown", () => {
    expect(parsePaywallSource(undefined)).toBe("unknown");
    expect(parsePaywallSource("")).toBe("unknown");
  });
  it("maps garbage to unknown", () => {
    expect(parsePaywallSource("hacked<script>")).toBe("unknown");
    expect(parsePaywallSource("SETTINGS")).toBe("unknown");
  });
  // Review Focus #5: expo-router hands repeated query params over as an array.
  it("maps an array value to unknown", () => {
    expect(parsePaywallSource(["settings", "watermark"])).toBe("unknown");
  });
});
