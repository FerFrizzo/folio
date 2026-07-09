import config from "@/app.config";
import pkg from "@/package.json";

// Guards the single source of truth: the marketing version must always come
// from package.json so a manual edit can't reintroduce the app.config /
// package.json drift that caused submission failures.
describe("app.config version", () => {
  it("derives the marketing version from package.json", () => {
    expect(config.version).toBe(pkg.version);
  });

  it("ties runtimeVersion to the app version so each release cuts a fresh OTA runtime", () => {
    expect(config.runtimeVersion).toEqual({ policy: "appVersion" });
  });
});
