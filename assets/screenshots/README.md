# Store screenshots

Drop final screenshots here, organised by store + device. Both stores
require a minimum of 2 screenshots per device class to publish; 5–8 is
the sweet spot for conversion.

## App Store Connect (iOS)

Apple requires screenshots for the **6.9" iPhone** display class. Smaller
sizes are auto-derived from it. iPad sizes are
optional but enable the iPad listing.

| Device class    | Resolution      | Notes                            |
| --------------- | --------------- | -------------------------------- |
| 6.9" iPhone     | 1320 × 2868 px  | Required (generated set)         |
| 6.7" iPhone     | 1290 × 2796 px  | Optional (Apple auto-derives)    |
| 6.5" iPhone     | 1242 × 2688 px  | Optional (Apple auto-derives)    |
| 12.9" iPad Pro  | 2048 × 2732 px  | Required if you ship the iPad listing |

## Google Play Console (Android)

Play requires phone + 7" tablet + 10" tablet, but only phone is mandatory
for an internal-track release.

| Device class | Resolution range            |
| ------------ | --------------------------- |
| Phone        | 1080–1920 px on the longer side, 16:9 ish |
| 7" tablet    | 1024–7680 px                |
| 10" tablet   | 1080–7680 px                |

## Generating the store sets

Screenshots for both stores are generated, not hand-captured. Each step is re-runnable:

1. `npm run screenshots:seed` — signs in to (or creates) the demo account and
   writes the fictional "Coastline Electrical" business, clients, invoices and
   logo to Firebase. Credentials live in `secrets/demo-account.json`.
2. Install a Release build with analytics off, then capture with
   [Maestro](https://maestro.mobile.dev) into `raw/<target>/` (gitignored):
   - iOS: `EXPO_PUBLIC_POSTHOG_KEY= npx expo run:ios --configuration Release --device "iPhone 17 Pro Max"`,
     then `npm run screenshots:capture -- ios`
   - Android phone: `EXPO_PUBLIC_POSTHOG_KEY= npx expo run:android --variant release` on
     `Medium_Phone_API_36.1`, then `npm run screenshots:capture -- android-phone`
   - Android tablet: `adb -s <id> install -r android/app/build/outputs/apk/release/app-release.apk`
     on `Tablet_10_inch`, then `npm run screenshots:capture -- android-tablet <id>`
3. `npm run screenshots:compose` — adds captions, background and device frame
   from `scripts/store-screenshots/captions.json`:

| Target | Size | Output |
| --- | --- | --- |
| iOS 6.9" iPhone | 1320 × 2868 | `ios/` |
| iOS 6.5" iPhone | 1284 × 2778 | `ios-6.5/` |
| Play phone | 1080 × 1920 | `android/phone/` |
| Play 7" tablet | 1080 × 1920 | `android/tablet-7/` |
| Play 10" tablet | 1440 × 2560 | `android/tablet-10/` |
| Play feature graphic | 1024 × 500 | `android/feature-graphic.png` |

Change copy or order in `captions.json` (a target's `skip` drops slots for that
store); change which screens are captured in `scripts/store-screenshots/capture.yaml`.

## Naming convention

```
ios-67-01-dashboard.png
ios-67-02-editor.png
…
android-phone-01-dashboard.png
android-phone-02-editor.png
…
```

Numeric prefix forces ordering in upload UIs.
