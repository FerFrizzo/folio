import { normaliseRoute } from "@/src/lib/analytics/route";

describe("normaliseRoute", () => {
  it("drops route groups", () => {
    expect(normaliseRoute(["(tabs)", "dashboard"])).toBe("/dashboard");
  });
  it("keeps dynamic segments as templates", () => {
    expect(normaliseRoute(["invoices", "[id]"])).toBe("/invoices/[id]");
  });
  it("maps the root to /", () => {
    expect(normaliseRoute([])).toBe("/");
    expect(normaliseRoute(["(tabs)"])).toBe("/");
  });
  it("keeps nested stacks", () => {
    expect(normaliseRoute(["onboarding", "logo"])).toBe("/onboarding/logo");
  });
});
