const { withAndroidManifest } = require("expo/config-plugins");

/**
 * `orientation: "portrait"` sets `screenOrientation="portrait"` on the main
 * activity, which makes Google Play infer a *required*
 * `android.hardware.screen.portrait` feature. Play then hides the app from
 * Chromebooks, landscape-only tablets and Android XR devices and flags the
 * release in the pre-review checks.
 *
 * Declaring the feature explicitly with `required="false"` overrides that
 * inference: the app still runs portrait-locked, but those devices can
 * install it.
 */
const OPTIONAL_FEATURES = ["android.hardware.screen.portrait"];

function setOptionalFeatures(manifest, features = OPTIONAL_FEATURES) {
  const root = manifest.manifest;
  const existing = root["uses-feature"] ?? [];

  for (const name of features) {
    const entry = existing.find((f) => f.$?.["android:name"] === name);
    if (entry) {
      entry.$["android:required"] = "false";
    } else {
      existing.push({ $: { "android:name": name, "android:required": "false" } });
    }
  }

  root["uses-feature"] = existing;
  return manifest;
}

function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = setOptionalFeatures(cfg.modResults);
    return cfg;
  });
}

module.exports = withOptionalScreenFeatures;
module.exports.setOptionalFeatures = setOptionalFeatures;
module.exports.OPTIONAL_FEATURES = OPTIONAL_FEATURES;
