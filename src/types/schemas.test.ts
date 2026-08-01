import { SettingsSchema } from "@/src/types/schemas";

describe("SettingsSchema.defaultGstRate", () => {
  // A brand-new user must not have 10% GST silently pre-applied to their
  // first invoice line. GST-registered users opt in via Settings.
  it("defaults a fresh settings document to GST-free", () => {
    expect(SettingsSchema.parse({}).defaultGstRate).toBe(0);
  });

  it("keeps 10% when the user has explicitly saved it", () => {
    expect(SettingsSchema.parse({ defaultGstRate: 0.1 }).defaultGstRate).toBe(0.1);
  });

  it("still rejects a rate above 100%", () => {
    expect(() => SettingsSchema.parse({ defaultGstRate: 1.5 })).toThrow();
  });
});
