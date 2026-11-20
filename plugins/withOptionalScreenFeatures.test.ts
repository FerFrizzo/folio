import type { ExportedConfig } from "expo/config-plugins";

import withOptionalScreenFeatures, {
  OPTIONAL_FEATURES,
  setOptionalFeatures,
} from "./withOptionalScreenFeatures";

type Feature = { $: Record<string, string> };
type Manifest = { manifest: { $?: Record<string, string>; "uses-feature"?: Feature[] } };

const PORTRAIT = "android.hardware.screen.portrait";

function baseManifest(features?: Feature[]): Manifest {
  return {
    manifest: {
      $: { "xmlns:android": "http://schemas.android.com/apk/res/android" },
      ...(features ? { "uses-feature": features } : {}),
    },
  };
}

function featuresOf(m: Manifest) {
  return m.manifest["uses-feature"] ?? [];
}

describe("setOptionalFeatures", () => {
  it("covers the portrait screen feature Play flagged", () => {
    expect(OPTIONAL_FEATURES).toContain(PORTRAIT);
  });

  it("adds the portrait feature as not required when the manifest has none", () => {
    const result = setOptionalFeatures(baseManifest());
    expect(featuresOf(result)).toEqual([
      { $: { "android:name": PORTRAIT, "android:required": "false" } },
    ]);
  });

  it("flips an existing required declaration to not required", () => {
    const result = setOptionalFeatures(
      baseManifest([{ $: { "android:name": PORTRAIT, "android:required": "true" } }]),
    );
    expect(featuresOf(result)).toEqual([
      { $: { "android:name": PORTRAIT, "android:required": "false" } },
    ]);
  });

  it("marks a declaration without a required attribute as not required", () => {
    const result = setOptionalFeatures(baseManifest([{ $: { "android:name": PORTRAIT } }]));
    expect(featuresOf(result)[0]?.$["android:required"]).toBe("false");
  });

  it("leaves unrelated feature declarations untouched", () => {
    const camera = { $: { "android:name": "android.hardware.camera", "android:required": "true" } };
    const result = setOptionalFeatures(baseManifest([camera]));
    expect(featuresOf(result)).toContainEqual(camera);
    expect(featuresOf(result)).toHaveLength(2);
  });

  it("is idempotent across repeated prebuilds", () => {
    const once = setOptionalFeatures(baseManifest());
    const twice = setOptionalFeatures(once);
    expect(featuresOf(twice).filter((f) => f.$["android:name"] === PORTRAIT)).toHaveLength(1);
  });

  it("accepts a custom feature list", () => {
    const result = setOptionalFeatures(baseManifest(), ["android.hardware.touchscreen"]);
    expect(featuresOf(result)).toEqual([
      { $: { "android:name": "android.hardware.touchscreen", "android:required": "false" } },
    ]);
  });
});

describe("withOptionalScreenFeatures", () => {
  it("registers an Android manifest mod", () => {
    const config: ExportedConfig = withOptionalScreenFeatures({ name: "Folio", slug: "folio" });
    expect(config.mods?.android?.manifest).toEqual(expect.any(Function));
  });
});
