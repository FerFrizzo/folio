const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * AppCheckCore (Swift) depends on GoogleUtilities and RecaptchaInterop (ObjC),
 * which don't define modules. CocoaPods needs modular_headers enabled for them
 * so Swift can import them when building as static libraries.
 */
module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const marker = "use_expo_modules!";
      if (podfile.includes(marker) && !podfile.includes("GoogleUtilities")) {
        podfile = podfile.replace(
          marker,
          [
            marker,
            "",
            "  # AppCheckCore (Swift) needs module maps for these ObjC dependencies",
            "  pod 'GoogleUtilities', :modular_headers => true",
            "  pod 'RecaptchaInterop', :modular_headers => true",
          ].join("\n")
        );
        fs.writeFileSync(podfilePath, podfile, "utf8");
      }

      return cfg;
    },
  ]);
};
