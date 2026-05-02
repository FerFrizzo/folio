import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Folio",
  slug: "folio",
  scheme: "folio",
  version: "1.0.0",
  // OTA channel binds to the store version; bumping `version` cuts a fresh
  // runtime so old binaries don't pick up incompatible JS bundles.
  runtimeVersion: { policy: "appVersion" },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.frizzo.folio",
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Folio needs access to your photo library so you can attach a logo to your business profile.",
      NSFaceIDUsageDescription:
        "Folio uses Face ID to unlock the app on launch when biometric is enabled.",
      NSCameraUsageDescription:
        "Folio doesn't use the camera. This entry exists in case you ever take a photo for a logo.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.frizzo.folio",
    adaptiveIcon: {
      backgroundColor: "#0B3D5C",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      // expo-document-picker uses the SAF on modern Android — no broad
      // storage permission needed. expo-image-picker prompts for media
      // access at runtime.
      "android.permission.USE_BIOMETRIC",
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-local-authentication",
    "expo-apple-authentication",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FAFAF7",
        dark: {
          backgroundColor: "#0E1116",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: undefined,
    },
  },
};

export default config;
